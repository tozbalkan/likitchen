import { createHash } from 'node:crypto';
import { PlanNode } from './plan-node';
import { PlanEdge } from './plan-edge';

export interface ComponentVersionMatrix {
  readonly plannerVersion?: string | undefined;
  readonly promptVersion?: string | undefined;
  readonly toolContractVersion?: string | undefined;
  readonly conditionEvaluatorVersion?: string | undefined;
}

export interface ExecutionGraphProps {
  readonly graphId: string;
  readonly graphChecksum: string;
  readonly graphHash: string;
  readonly nodes: ReadonlyArray<PlanNode>;
  readonly edges: ReadonlyArray<PlanEdge>;
  readonly versionMatrix?: ComponentVersionMatrix | undefined;
  readonly createdAt: Date;
}

export class ExecutionGraph {
  readonly graphId: string;
  readonly graphChecksum: string;
  readonly graphHash: string;
  readonly nodes: ReadonlyArray<PlanNode>;
  readonly edges: ReadonlyArray<PlanEdge>;
  readonly versionMatrix?: ComponentVersionMatrix | undefined;
  readonly createdAt: Date;

  private readonly incomingMap: Map<string, ReadonlyArray<PlanEdge>>;
  private readonly outgoingMap: Map<string, ReadonlyArray<PlanEdge>>;
  private readonly nodeMap: Map<string, PlanNode>;
  private readonly cachedSortedNodes: ReadonlyArray<PlanNode>;
  private readonly cachedTiers: ReadonlyArray<ReadonlyArray<PlanNode>>;

  constructor(props: ExecutionGraphProps) {
    this.graphId = props.graphId;
    this.graphChecksum = props.graphChecksum;
    this.graphHash = props.graphHash;
    this.nodes = Object.freeze([...props.nodes]);
    this.edges = Object.freeze([...props.edges]);
    this.versionMatrix = props.versionMatrix
      ? Object.freeze({ ...props.versionMatrix })
      : undefined;
    this.createdAt = new Date(props.createdAt);

    // 1. O(1) Node & Edge Adjacency Lookups
    const nodeMap = new Map<string, PlanNode>();
    for (const n of this.nodes) {
      nodeMap.set(n.nodeId, n);
    }
    this.nodeMap = nodeMap;

    const inMap = new Map<string, PlanEdge[]>();
    const outMap = new Map<string, PlanEdge[]>();
    for (const n of this.nodes) {
      inMap.set(n.nodeId, []);
      outMap.set(n.nodeId, []);
    }
    for (const e of this.edges) {
      outMap.get(e.sourceNodeId)?.push(e);
      inMap.get(e.targetNodeId)?.push(e);
    }

    const frozenInMap = new Map<string, ReadonlyArray<PlanEdge>>();
    const frozenOutMap = new Map<string, ReadonlyArray<PlanEdge>>();
    for (const [k, v] of inMap.entries()) {
      frozenInMap.set(k, Object.freeze([...v]));
    }
    for (const [k, v] of outMap.entries()) {
      frozenOutMap.set(k, Object.freeze([...v]));
    }
    this.incomingMap = frozenInMap;
    this.outgoingMap = frozenOutMap;

    // 2. Precompute topological sort using O(1) Kahn algorithm head pointer
    const sorted = this.computeTopologicalSort();
    this.cachedSortedNodes = Object.freeze(sorted);

    // 3. Precompute parallel tiers
    this.cachedTiers = Object.freeze(this.computeParallelTiers(sorted));

    Object.freeze(this);
  }

  static create(
    graphId: string,
    nodes: ReadonlyArray<PlanNode>,
    edges: ReadonlyArray<PlanEdge>,
    versionMatrix?: ComponentVersionMatrix,
    createdAt?: Date,
  ): ExecutionGraph {
    const matrixStr = versionMatrix
      ? `${versionMatrix.plannerVersion ?? '1.0'}:${versionMatrix.promptVersion ?? '1.0'}:${versionMatrix.toolContractVersion ?? '1.0'}:${versionMatrix.conditionEvaluatorVersion ?? '1.0'}`
      : 'v1.0';

    const fullPayloadString =
      matrixStr +
      '|NODES:' +
      nodes
        .map(
          (n) =>
            `${n.nodeId}:${n.behaviorType}:${n.policy.type}:${JSON.stringify(n.payload)}`,
        )
        .sort()
        .join(';') +
      '|EDGES:' +
      edges
        .map(
          (e) =>
            `${e.sourceNodeId}->${e.targetNodeId}:${e.condition ?? 'none'}`,
        )
        .sort()
        .join(';');

    const checksum = `sha256-${createHash('sha256').update(fullPayloadString).digest('hex')}`;
    const hash = `hash-${createHash('md5').update(fullPayloadString).digest('hex').slice(0, 12)}`;

    return new ExecutionGraph({
      graphId,
      graphChecksum: checksum,
      graphHash: hash,
      nodes,
      edges,
      versionMatrix,
      createdAt: createdAt ?? new Date(),
    });
  }

  getNode(nodeId: string): PlanNode | undefined {
    return this.nodeMap.get(nodeId);
  }

  getIncomingEdges(nodeId: string): ReadonlyArray<PlanEdge> {
    return this.incomingMap.get(nodeId) ?? [];
  }

  getOutgoingEdges(nodeId: string): ReadonlyArray<PlanEdge> {
    return this.outgoingMap.get(nodeId) ?? [];
  }

  topologicalSort(): ReadonlyArray<PlanNode> {
    return this.cachedSortedNodes;
  }

  parallelTiers(): ReadonlyArray<ReadonlyArray<PlanNode>> {
    return this.cachedTiers;
  }

  private computeTopologicalSort(): PlanNode[] {
    const inDegree = new Map<string, number>();
    for (const node of this.nodes) {
      inDegree.set(node.nodeId, 0);
    }
    for (const edge of this.edges) {
      inDegree.set(
        edge.targetNodeId,
        (inDegree.get(edge.targetNodeId) ?? 0) + 1,
      );
    }

    const queue: string[] = [];
    for (const [nodeId, deg] of inDegree.entries()) {
      if (deg === 0) queue.push(nodeId);
    }

    const sorted: PlanNode[] = [];
    let head = 0;
    while (head < queue.length) {
      const currId = queue[head++]!;
      const currNode = this.getNode(currId);
      if (currNode) sorted.push(currNode);

      for (const edge of this.getOutgoingEdges(currId)) {
        const targetDeg = (inDegree.get(edge.targetNodeId) ?? 1) - 1;
        inDegree.set(edge.targetNodeId, targetDeg);
        if (targetDeg === 0) queue.push(edge.targetNodeId);
      }
    }

    if (sorted.length !== this.nodes.length) {
      throw new Error(
        `[ExecutionGraph] Graph '${this.graphId}' contains a cycle or invalid dependency.`,
      );
    }

    return sorted;
  }

  private computeParallelTiers(
    sorted: ReadonlyArray<PlanNode>,
  ): ReadonlyArray<ReadonlyArray<PlanNode>> {
    const nodeLevel = new Map<string, number>();

    for (const node of sorted) {
      const incoming = this.getIncomingEdges(node.nodeId);
      if (incoming.length === 0) {
        nodeLevel.set(node.nodeId, 0);
      } else {
        let maxParentLevel = 0;
        for (const edge of incoming) {
          const parentLevel = nodeLevel.get(edge.sourceNodeId) ?? 0;
          maxParentLevel = Math.max(maxParentLevel, parentLevel);
        }
        nodeLevel.set(node.nodeId, maxParentLevel + 1);
      }
    }

    const tiersMap = new Map<number, PlanNode[]>();
    for (const node of sorted) {
      const level = nodeLevel.get(node.nodeId) ?? 0;
      let tier = tiersMap.get(level);
      if (!tier) {
        tier = [];
        tiersMap.set(level, tier);
      }
      tier.push(node);
    }

    const levels = Array.from(tiersMap.keys()).sort((a, b) => a - b);
    return levels.map((lvl) => Object.freeze(tiersMap.get(lvl)!));
  }
}

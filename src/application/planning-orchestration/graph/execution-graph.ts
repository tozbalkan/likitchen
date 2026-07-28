import { PlanNode } from './plan-node';
import { PlanEdge } from './plan-edge';

export interface ExecutionGraphProps {
  readonly graphId: string;
  readonly graphChecksum: string;
  readonly graphHash: string;
  readonly nodes: ReadonlyArray<PlanNode>;
  readonly edges: ReadonlyArray<PlanEdge>;
  readonly createdAt: Date;
}

export class ExecutionGraph {
  readonly graphId: string;
  readonly graphChecksum: string;
  readonly graphHash: string;
  readonly nodes: ReadonlyArray<PlanNode>;
  readonly edges: ReadonlyArray<PlanEdge>;
  readonly createdAt: Date;

  constructor(props: ExecutionGraphProps) {
    this.graphId = props.graphId;
    this.graphChecksum = props.graphChecksum;
    this.graphHash = props.graphHash;
    this.nodes = Object.freeze([...props.nodes]);
    this.edges = Object.freeze([...props.edges]);
    this.createdAt = new Date(props.createdAt);
    Object.freeze(this);
  }

  static create(
    graphId: string,
    nodes: ReadonlyArray<PlanNode>,
    edges: ReadonlyArray<PlanEdge>,
  ): ExecutionGraph {
    const rawContent =
      nodes
        .map((n) => n.nodeId)
        .sort()
        .join(',') +
      '|' +
      edges
        .map((e) => `${e.sourceNodeId}->${e.targetNodeId}`)
        .sort()
        .join(';');
    // Compute simple deterministic checksum & hash for immutability verification
    let hashVal = 0;
    for (let i = 0; i < rawContent.length; i++) {
      hashVal = (hashVal << 5) - hashVal + rawContent.charCodeAt(i);
      hashVal |= 0;
    }
    const checksum = `chk-${Math.abs(hashVal).toString(16)}`;
    const hash = `hash-${Math.abs(hashVal).toString(36)}`;

    return new ExecutionGraph({
      graphId,
      graphChecksum: checksum,
      graphHash: hash,
      nodes,
      edges,
      createdAt: new Date(),
    });
  }

  getNode(nodeId: string): PlanNode | undefined {
    return this.nodes.find((n) => n.nodeId === nodeId);
  }

  getIncomingEdges(nodeId: string): ReadonlyArray<PlanEdge> {
    return this.edges.filter((e) => e.targetNodeId === nodeId);
  }

  getOutgoingEdges(nodeId: string): ReadonlyArray<PlanEdge> {
    return this.edges.filter((e) => e.sourceNodeId === nodeId);
  }

  topologicalSort(): ReadonlyArray<PlanNode> {
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
    while (queue.length > 0) {
      const currId = queue.shift()!;
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

    return Object.freeze(sorted);
  }

  parallelTiers(): ReadonlyArray<ReadonlyArray<PlanNode>> {
    const sorted = this.topologicalSort();
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
    return Object.freeze(
      levels.map((lvl) => Object.freeze(tiersMap.get(lvl)!)),
    );
  }
}

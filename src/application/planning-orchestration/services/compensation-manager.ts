import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';
import { ExecutionDispatcher } from '../engine/execution-dispatcher';
import { PlanNode } from '../graph/plan-node';

export interface RollbackResult {
  readonly compensationNodeId: string;
  readonly targetNodeId: string;
  readonly idempotencyKey: string;
  readonly success: boolean;
  readonly error?: string | undefined;
}

export class CompensationManager {
  private readonly executedKeys = new Set<string>();

  async runCompensation(
    tenant: Readonly<TenantContext>,
    instance: Readonly<ExecutionPlanInstance>,
    graph: Readonly<ExecutionGraph>,
    dispatcher?: ExecutionDispatcher,
  ): Promise<ReadonlyArray<RollbackResult>> {
    const results: RollbackResult[] = [];

    // 1. Get completed nodes in true reverse topological order
    const completedSet = new Set(instance.cursor.completedNodeIds);
    const reverseTopologicalNodes = graph
      .topologicalSort()
      .slice()
      .reverse()
      .filter((n) => completedSet.has(n.nodeId));

    // 2. Execute compensation nodes in reverse order
    for (const node of reverseTopologicalNodes) {
      if (!node.compensationNodeId) continue;

      const idempotencyKey = `rollback-${instance.instanceId}-${node.nodeId}`;
      if (this.executedKeys.has(idempotencyKey)) {
        // Idempotent skip
        results.push({
          compensationNodeId: node.compensationNodeId,
          targetNodeId: node.nodeId,
          idempotencyKey,
          success: true,
        });
        continue;
      }

      this.executedKeys.add(idempotencyKey);

      if (dispatcher) {
        const compensationNode = new PlanNode({
          nodeId: node.compensationNodeId,
          name: `Rollback for ${node.name}`,
          behaviorType: 'TOOL',
          payload: { rollbackTargetNodeId: node.nodeId },
        });

        const execRes = await dispatcher.dispatchNode(
          tenant,
          compensationNode,
          instance,
        );

        results.push({
          compensationNodeId: node.compensationNodeId,
          targetNodeId: node.nodeId,
          idempotencyKey,
          success: execRes.success,
          error: execRes.error,
        });
      } else {
        results.push({
          compensationNodeId: node.compensationNodeId,
          targetNodeId: node.nodeId,
          idempotencyKey,
          success: true,
        });
      }
    }

    return Object.freeze(results);
  }
}

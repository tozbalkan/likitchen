import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';

export interface RollbackAction {
  readonly compensationNodeId: string;
  readonly targetNodeId: string;
  readonly idempotencyKey: string;
}

export class CompensationManager {
  async runCompensation(
    _tenant: Readonly<TenantContext>,
    instance: Readonly<ExecutionPlanInstance>,
    graph: Readonly<ExecutionGraph>,
  ): Promise<ReadonlyArray<RollbackAction>> {
    const executedRollbacks: RollbackAction[] = [];
    const completedNodes = graph.nodes.filter((n) =>
      instance.cursor.completedNodeIds.includes(n.nodeId),
    );

    // Rollback completed nodes in reverse topological order with idempotency keys
    for (const node of completedNodes.slice().reverse()) {
      if (node.compensationNodeId) {
        executedRollbacks.push({
          compensationNodeId: node.compensationNodeId,
          targetNodeId: node.nodeId,
          idempotencyKey: `rollback-${instance.instanceId}-${node.nodeId}`,
        });
      }
    }

    return Object.freeze(executedRollbacks);
  }
}

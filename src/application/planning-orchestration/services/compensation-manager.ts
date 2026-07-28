import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';

export class CompensationManager {
  async runCompensation(
    _tenant: Readonly<TenantContext>,
    instance: Readonly<ExecutionPlanInstance>,
    graph: Readonly<ExecutionGraph>,
  ): Promise<ReadonlyArray<string>> {
    const executedRollbacks: string[] = [];
    const completedNodes = graph.nodes.filter((n) =>
      instance.cursor.completedNodeIds.includes(n.nodeId),
    );

    // Rollback completed nodes in reverse topological order
    for (const node of completedNodes.slice().reverse()) {
      if (node.compensationNodeId) {
        executedRollbacks.push(node.compensationNodeId);
      }
    }

    return Object.freeze(executedRollbacks);
  }
}

import { randomUUID } from 'node:crypto';
import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';
import { ExecutionDispatcher } from '../engine/execution-dispatcher';
import { PlanNode } from '../graph/plan-node';
import { ExecutionSpan } from '../vo/execution-trace';

export interface RollbackResult {
  readonly compensationNodeId: string;
  readonly targetNodeId: string;
  readonly idempotencyKey: string;
  readonly success: boolean;
  readonly error?: string | undefined;
}

export class CompensationManager {
  async runCompensation(
    tenant: Readonly<TenantContext>,
    instance: Readonly<ExecutionPlanInstance>,
    graph: Readonly<ExecutionGraph>,
    dispatcher?: ExecutionDispatcher,
  ): Promise<{
    readonly updatedInstance: ExecutionPlanInstance;
    readonly results: ReadonlyArray<RollbackResult>;
  }> {
    const results: RollbackResult[] = [];
    let currentInstance = instance;

    // 1. Get completed nodes in true reverse topological order
    const completedSet = new Set(currentInstance.cursor.completedNodeIds);
    const reverseTopologicalNodes = graph
      .topologicalSort()
      .slice()
      .reverse()
      .filter((n) => completedSet.has(n.nodeId));

    // 2. Execute compensation nodes in reverse order
    for (const node of reverseTopologicalNodes) {
      if (!node.compensationNodeId) continue;

      const idempotencyKey = `rollback-${currentInstance.instanceId}-${node.nodeId}`;
      if (currentInstance.executedRollbackKeys.includes(idempotencyKey)) {
        // Durable Idempotent skip
        results.push({
          compensationNodeId: node.compensationNodeId,
          targetNodeId: node.nodeId,
          idempotencyKey,
          success: true,
        });
        continue;
      }

      currentInstance = currentInstance.addExecutedRollbackKey(idempotencyKey);

      if (dispatcher) {
        const compensationNode = new PlanNode({
          nodeId: node.compensationNodeId,
          name: `Rollback for ${node.name}`,
          behaviorType: 'TOOL',
          payload: { rollbackTargetNodeId: node.nodeId },
        });

        const startTime = new Date();
        const execRes = await dispatcher.dispatchNode(
          tenant,
          compensationNode,
          currentInstance,
        );
        const endTime = new Date();

        const span = new ExecutionSpan({
          spanId: `span-${node.compensationNodeId}-${randomUUID()}`,
          nodeId: node.compensationNodeId,
          behaviorType: 'COMPENSATION',
          startTime,
          endTime,
          durationMs: endTime.getTime() - startTime.getTime(),
          status: execRes.success ? 'SUCCESS' : 'FAILED',
          error: execRes.error,
        });

        currentInstance = currentInstance.addSpan(span);

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

    return {
      updatedInstance: currentInstance,
      results: Object.freeze(results),
    };
  }
}

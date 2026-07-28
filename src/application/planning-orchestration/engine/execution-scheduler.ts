import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';
import { ExecutionDispatcher } from './execution-dispatcher';
import { ExecutionCheckpoint } from '../vo/execution-checkpoint';
import { BudgetPlanner } from '../services/budget-planner';
import { ExecutionSpan } from '../vo/execution-trace';

export class ExecutionScheduler {
  constructor(
    private readonly dispatcher: ExecutionDispatcher,
    private readonly budgetPlanner: BudgetPlanner = new BudgetPlanner(),
  ) {}

  async stepExecution(
    tenant: Readonly<TenantContext>,
    instance: Readonly<ExecutionPlanInstance>,
    graph: Readonly<ExecutionGraph>,
  ): Promise<ExecutionPlanInstance> {
    if (
      instance.state === 'COMPLETED' ||
      instance.state === 'FAILED' ||
      instance.state === 'CANCELLED'
    ) {
      return instance;
    }

    // 1. Resource Budget Check
    if (!this.budgetPlanner.hasSufficientBudget(instance, 0.001)) {
      return instance.withState('PAUSED');
    }

    let currentInstance = instance.withState('RUNNING');
    const tiers = graph.parallelTiers();

    for (const tier of tiers) {
      // 2. Filter ready nodes in this parallel tier using O(1) Adjacency Lookups
      const readyNodes = tier.filter((node) => {
        const isPendingOrWaiting =
          currentInstance.cursor.pendingNodeIds.includes(node.nodeId) ||
          currentInstance.cursor.waitingNodeIds.includes(node.nodeId);
        const isCompleted = currentInstance.cursor.completedNodeIds.includes(
          node.nodeId,
        );
        const incoming = graph.getIncomingEdges(node.nodeId);
        const parentsDone = incoming.every((e) =>
          currentInstance.cursor.completedNodeIds.includes(e.sourceNodeId),
        );
        return isPendingOrWaiting && !isCompleted && parentsDone;
      });

      if (readyNodes.length === 0) continue;

      // 3. Dispatch ready nodes concurrently across tier
      const startTime = new Date();
      const results = await Promise.all(
        readyNodes.map(async (node) => {
          const res = await this.dispatcher.dispatchNode(
            tenant,
            node,
            currentInstance,
          );
          return { node, res };
        }),
      );

      // 4. Update state, checkpoints, failure policies, and cursor
      for (const { node, res } of results) {
        const endTime = new Date();
        const durationMs = endTime.getTime() - startTime.getTime();

        if (res.isCheckpointWaiting) {
          const cp = ExecutionCheckpoint.createPending(
            `cp-${node.nodeId}`,
            node.nodeId,
          );
          currentInstance = currentInstance
            .addCheckpoint(cp)
            .withState('CHECKPOINT_WAIT')
            .withCursor(currentInstance.cursor.markWaiting(node.nodeId));

          return currentInstance; // Stop execution for human checkpoint
        }

        if (!res.success) {
          // Evaluate Node Execution Failure Policy
          if (
            node.policy.type === 'CONTINUE_ON_FAILURE' ||
            node.policy.type === 'SKIP_NODE'
          ) {
            currentInstance = currentInstance.withCursor(
              currentInstance.cursor.markCompleted(node.nodeId),
            );
            continue;
          }

          return currentInstance.withState('FAILED');
        }

        currentInstance = currentInstance.withCursor(
          currentInstance.cursor.markCompleted(node.nodeId),
        );
      }
    }

    const allCompleted =
      currentInstance.cursor.pendingNodeIds.length === 0 &&
      currentInstance.cursor.waitingNodeIds.length === 0;
    if (allCompleted) {
      currentInstance = currentInstance.withState('COMPLETED');
    }

    return currentInstance;
  }
}

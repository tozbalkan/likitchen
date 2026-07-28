import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';
import { ExecutionDispatcher } from './execution-dispatcher';
import { ExecutionCheckpoint } from '../vo/execution-checkpoint';
import { BudgetPlanner } from '../services/budget-planner';
import { CompensationManager } from '../services/compensation-manager';
import { ExecutionSpan } from '../vo/execution-trace';

export class ExecutionScheduler {
  constructor(
    private readonly dispatcher: ExecutionDispatcher,
    private readonly budgetPlanner: BudgetPlanner = new BudgetPlanner(),
    private readonly compensationManager: CompensationManager = new CompensationManager(),
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

    // 1. Budget Resource Check
    if (!this.budgetPlanner.hasSufficientBudget(instance, 0.001)) {
      return instance.withState('PAUSED');
    }

    let currentInstance = instance.withState('RUNNING');
    const tiers = graph.parallelTiers();

    for (const tier of tiers) {
      // 2. Fast O(1) Set lookups for ready node filtering
      const completedSet = new Set(currentInstance.cursor.completedNodeIds);
      const pendingSet = new Set(currentInstance.cursor.pendingNodeIds);

      // Node is ready ONLY if pending (NOT waiting), NOT completed, and all parents are completed
      const readyNodes = tier.filter((node) => {
        if (!pendingSet.has(node.nodeId) || completedSet.has(node.nodeId)) {
          return false;
        }
        const incoming = graph.getIncomingEdges(node.nodeId);
        return incoming.every((e) => completedSet.has(e.sourceNodeId));
      });

      if (readyNodes.length === 0) continue;

      // 3. Dispatch ready nodes concurrently across tier with per-node span timing
      const results = await Promise.all(
        readyNodes.map(async (node) => {
          const startTime = new Date();
          const res = await this.dispatcher.dispatchNode(
            tenant,
            node,
            currentInstance,
          );
          const endTime = new Date();

          const span = new ExecutionSpan({
            spanId: `span-${node.nodeId}-${Date.now()}`,
            nodeId: node.nodeId,
            behaviorType: node.behaviorType,
            startTime,
            endTime,
            durationMs: endTime.getTime() - startTime.getTime(),
            status: res.success
              ? 'SUCCESS'
              : res.isCheckpointWaiting
                ? 'CHECKPOINT_WAIT'
                : 'FAILED',
            error: res.error,
          });

          return { node, res, span };
        }),
      );

      // 4. Update cursor, checkpoints, and failure policies
      for (const { node, res } of results) {
        if (
          res.isCheckpointWaiting ||
          node.policy.type === 'WAIT_FOR_APPROVAL'
        ) {
          const cp = ExecutionCheckpoint.createPending(
            `cp-${node.nodeId}`,
            node.nodeId,
          );
          currentInstance = currentInstance
            .addCheckpoint(cp)
            .withState('CHECKPOINT_WAIT')
            .withCursor(currentInstance.cursor.markWaiting(node.nodeId));

          return currentInstance; // Stop execution step cleanly for human checkpoint
        }

        if (!res.success) {
          // Failure Policy Orchestration
          if (
            node.policy.type === 'CONTINUE_ON_FAILURE' ||
            node.policy.type === 'SKIP_NODE'
          ) {
            currentInstance = currentInstance.withCursor(
              currentInstance.cursor.markCompleted(node.nodeId),
            );
            continue;
          }

          if (node.policy.type === 'RUN_COMPENSATION') {
            await this.compensationManager.runCompensation(
              tenant,
              currentInstance,
              graph,
            );
            return currentInstance.withState('FAILED');
          }

          // Default ABORT_PLAN behavior
          return currentInstance.withState('FAILED');
        }

        currentInstance = currentInstance.withCursor(
          currentInstance.cursor.markCompleted(node.nodeId),
        );
      }
    }

    // 5. Strict Completion Invariant: pending == 0 && waiting == 0 && running == 0
    const pendingCount = currentInstance.cursor.pendingNodeIds.length;
    const waitingCount = currentInstance.cursor.waitingNodeIds.length;
    const runningCount = currentInstance.cursor.runningNodeIds.length;

    if (pendingCount === 0 && waitingCount === 0 && runningCount === 0) {
      currentInstance = currentInstance.withState('COMPLETED');
    }

    return currentInstance;
  }
}

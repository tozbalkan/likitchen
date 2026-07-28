import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';
import { ExecutionDispatcher } from './execution-dispatcher';
import { ExecutionCheckpoint } from '../vo/execution-checkpoint';
import { BudgetPlanner } from '../services/budget-planner';
import { CompensationManager } from '../services/compensation-manager';
import { ExecutionSpan } from '../vo/execution-trace';
import { PlanNode } from '../graph/plan-node';
import type { NodeExecutionAdapterResult } from '../adapters/node-execution-adapter-port';

interface DispatchedOutcome {
  readonly node: PlanNode;
  readonly result: NodeExecutionAdapterResult;
  readonly span: ExecutionSpan;
}

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
      instance.state === 'CANCELLED' ||
      instance.state === 'CHECKPOINT_WAIT'
    ) {
      return instance;
    }

    // 1. Budget Resource Check
    if (!this.budgetPlanner.hasSufficientBudget(instance, 0.001)) {
      return instance.withState('PAUSED');
    }

    let currentInstance = instance.withState('RUNNING');
    const tiers = graph.parallelTiers(); // O(1) Precomputed property access

    for (const tier of tiers) {
      // 2. Filter ready nodes in current tier using fast O(1) Set lookups
      const completedSet = new Set(currentInstance.cursor.completedNodeIds);
      const pendingSet = new Set(currentInstance.cursor.pendingNodeIds);

      const readyNodes = tier.filter((node) => {
        if (!pendingSet.has(node.nodeId) || completedSet.has(node.nodeId)) {
          return false;
        }
        const incoming = graph.getIncomingEdges(node.nodeId);
        return incoming.every((e) => completedSet.has(e.sourceNodeId));
      });

      if (readyNodes.length === 0) continue;

      // Mark ready nodes as RUNNING on cursor before dispatching
      let runningCursor = currentInstance.cursor;
      for (const node of readyNodes) {
        runningCursor = runningCursor.markRunning(node.nodeId);
      }
      currentInstance = currentInstance.withCursor(runningCursor);

      // 3. Phase 1 — Dispatch ready nodes concurrently across tier
      const outcomes: DispatchedOutcome[] = await Promise.all(
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

          return { node, result: res, span };
        }),
      );

      // 4. Phase 2 — Two-Phase Result Reconciliation
      // Step A: Record all execution spans and costs to trace/instance state
      for (const outcome of outcomes) {
        currentInstance = currentInstance.addSpan(outcome.span);
      }

      // Step B: Collect successful nodes & mark completed on cursor
      const successfulOutcomes = outcomes.filter(
        (o) => o.result.success && !o.result.isCheckpointWaiting,
      );
      for (const { node } of successfulOutcomes) {
        currentInstance = currentInstance.withCursor(
          currentInstance.cursor.markCompleted(node.nodeId),
        );
      }

      // Step C: Process Checkpoint Requests
      const checkpointOutcomes = outcomes.filter(
        (o) =>
          o.result.isCheckpointWaiting ||
          o.node.policy.type === 'WAIT_FOR_APPROVAL',
      );
      if (checkpointOutcomes.length > 0) {
        for (const { node } of checkpointOutcomes) {
          const cp = ExecutionCheckpoint.createPending(
            `cp-${node.nodeId}`,
            node.nodeId,
          );
          currentInstance = currentInstance
            .addCheckpoint(cp)
            .withCursor(currentInstance.cursor.markWaiting(node.nodeId));
        }
        return currentInstance.withState('CHECKPOINT_WAIT');
      }

      // Step D: Process Failure Policies
      const failedOutcomes = outcomes.filter((o) => !o.result.success);
      if (failedOutcomes.length > 0) {
        let shouldFailPlan = false;
        let requiresCompensation = false;

        for (const { node } of failedOutcomes) {
          if (
            node.policy.type === 'CONTINUE_ON_FAILURE' ||
            node.policy.type === 'SKIP_NODE'
          ) {
            currentInstance = currentInstance.withCursor(
              currentInstance.cursor.markCompleted(node.nodeId),
            );
          } else {
            currentInstance = currentInstance.withCursor(
              currentInstance.cursor.markFailed(node.nodeId),
            );
            shouldFailPlan = true;
            if (node.policy.type === 'RUN_COMPENSATION') {
              requiresCompensation = true;
            }
          }
        }

        if (shouldFailPlan) {
          if (requiresCompensation) {
            await this.compensationManager.runCompensation(
              tenant,
              currentInstance,
              graph,
              this.dispatcher,
            );
          }
          return currentInstance.withState('FAILED');
        }
      }
    }

    // 5. Phase 3 — Strict Completion Invariant: pending == 0 && waiting == 0 && running == 0
    const pendingCount = currentInstance.cursor.pendingNodeIds.length;
    const waitingCount = currentInstance.cursor.waitingNodeIds.length;
    const runningCount = currentInstance.cursor.runningNodeIds.length;

    if (pendingCount === 0 && waitingCount === 0 && runningCount === 0) {
      currentInstance = currentInstance.withState('COMPLETED');
    }

    return currentInstance;
  }
}

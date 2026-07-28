import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';
import { ExecutionDispatcher } from './execution-dispatcher';
import { ExecutionCheckpoint } from '../vo/execution-checkpoint';

export class ExecutionScheduler {
  constructor(private readonly dispatcher: ExecutionDispatcher) {}

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

    let currentInstance = instance.withState('RUNNING');
    const tiers = graph.parallelTiers();

    for (const tier of tiers) {
      // Filter ready nodes in this tier (node is in pending or waiting, and all parent edges are completed)
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

      // Dispatch ready nodes in parallel
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

      for (const { node, res } of results) {
        if (res.isCheckpointWaiting) {
          const cp = ExecutionCheckpoint.createPending(
            `cp-${node.nodeId}`,
            node.nodeId,
          );
          currentInstance = currentInstance
            .addCheckpoint(cp)
            .withState('CHECKPOINT_WAIT')
            .withCursor(currentInstance.cursor.markWaiting(node.nodeId));
          return currentInstance; // Pause execution for human checkpoint
        }

        if (!res.success) {
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

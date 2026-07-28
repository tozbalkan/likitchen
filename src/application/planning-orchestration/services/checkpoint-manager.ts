import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionCursor } from '../vo/execution-cursor';

export class CheckpointManager {
  approveCheckpoint(
    instance: Readonly<ExecutionPlanInstance>,
    checkpointId: string,
    approverId: string,
    comments?: string,
  ): ExecutionPlanInstance {
    const cp = instance.checkpoints.find(
      (c) => c.checkpointId === checkpointId,
    );
    if (!cp) {
      throw new Error(
        `[CheckpointManager] Checkpoint '${checkpointId}' not found.`,
      );
    }

    const approved = cp.approve(approverId, comments);
    let updated = instance.addCheckpoint(approved);

    // Release node from waitingNodeIds back to pendingNodeIds for execution scheduler
    const newWaiting = updated.cursor.waitingNodeIds.filter(
      (id) => id !== cp.nodeId,
    );
    const newPending = [
      ...new Set([...updated.cursor.pendingNodeIds, cp.nodeId]),
    ];
    const newCursor = new ExecutionCursor({
      ...updated.cursor,
      waitingNodeIds: newWaiting,
      pendingNodeIds: newPending,
    });

    updated = updated.withCursor(newCursor);
    return updated.state === 'CHECKPOINT_WAIT'
      ? updated.withState('PLANNED')
      : updated;
  }

  rejectCheckpoint(
    instance: Readonly<ExecutionPlanInstance>,
    checkpointId: string,
    approverId: string,
    comments?: string,
  ): ExecutionPlanInstance {
    const cp = instance.checkpoints.find(
      (c) => c.checkpointId === checkpointId,
    );
    if (!cp) {
      throw new Error(
        `[CheckpointManager] Checkpoint '${checkpointId}' not found.`,
      );
    }

    const rejected = cp.reject(approverId, comments);
    return instance.addCheckpoint(rejected).withState('FAILED');
  }
}

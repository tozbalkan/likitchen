import { ExecutionPlanInstance } from '../domain/execution-plan-instance';

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
    const updated = instance.addCheckpoint(approved);
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

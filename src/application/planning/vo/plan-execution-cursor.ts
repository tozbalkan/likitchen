export type SubGoalStatus =
  'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export interface PlanExecutionCursorProps {
  readonly planId: string;
  readonly planVersion: number;
  readonly nodeStatuses: ReadonlyMap<string, SubGoalStatus>;
}

export class PlanExecutionCursor {
  readonly planId: string;
  readonly planVersion: number;
  readonly nodeStatuses: ReadonlyMap<string, SubGoalStatus>;

  private constructor(props: Readonly<PlanExecutionCursorProps>) {
    if (!props.planId || props.planId.trim() === '') {
      throw new Error('[PlanExecutionCursor] planId is required.');
    }

    this.planId = props.planId;
    this.planVersion = props.planVersion;
    this.nodeStatuses = new Map(props.nodeStatuses);
    Object.freeze(this);
  }

  static initial(
    planId: string,
    planVersion: number,
    nodeIds: readonly string[],
  ): PlanExecutionCursor {
    const statuses = new Map<string, SubGoalStatus>();
    for (const id of nodeIds) {
      statuses.set(id, 'PENDING');
    }
    return new PlanExecutionCursor({
      planId,
      planVersion,
      nodeStatuses: statuses,
    });
  }

  getStatus(subGoalId: string): SubGoalStatus {
    return this.nodeStatuses.get(subGoalId) ?? 'PENDING';
  }

  advance(subGoalId: string, newStatus: SubGoalStatus): PlanExecutionCursor {
    const nextStatuses = new Map(this.nodeStatuses);
    nextStatuses.set(subGoalId, newStatus);
    return new PlanExecutionCursor({
      planId: this.planId,
      planVersion: this.planVersion,
      nodeStatuses: nextStatuses,
    });
  }
}

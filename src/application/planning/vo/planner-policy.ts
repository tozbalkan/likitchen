export type SubGoalFailureAction = 'REPLAN' | 'SKIP_OPTIONAL' | 'HALT_PLAN';

export interface PlannerBudgetPolicyProps {
  readonly maxPlanVersions?: number | undefined;
  readonly maxReplans?: number | undefined;
}

export class PlannerBudgetPolicy {
  readonly maxPlanVersions: number;
  readonly maxReplans: number;

  private constructor(props: Readonly<PlannerBudgetPolicyProps>) {
    const maxVersions = props.maxPlanVersions ?? 3;
    const maxReplans = props.maxReplans ?? 2;

    if (maxVersions < 1) {
      throw new Error(
        '[PlannerBudgetPolicy] maxPlanVersions must be at least 1.',
      );
    }
    if (maxReplans < 0) {
      throw new Error('[PlannerBudgetPolicy] maxReplans cannot be negative.');
    }

    this.maxPlanVersions = maxVersions;
    this.maxReplans = maxReplans;
    Object.freeze(this);
  }

  static default(): PlannerBudgetPolicy {
    return new PlannerBudgetPolicy({});
  }

  static create(
    props: Readonly<PlannerBudgetPolicyProps>,
  ): PlannerBudgetPolicy {
    return new PlannerBudgetPolicy(props);
  }

  canReplan(currentVersion: number): boolean {
    return currentVersion < this.maxPlanVersions;
  }
}

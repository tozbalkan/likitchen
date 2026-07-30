import type { TenantContext } from '../../identity/tenant-context';
import type { AutonomousPlan } from '../vo/autonomous-plan';
import type { PlanExecutionCursor } from '../vo/plan-execution-cursor';
import type { SubGoalFailureAction } from '../vo/planner-policy';

export interface PlanExecutionResult {
  readonly plan: AutonomousPlan;
  readonly cursor: PlanExecutionCursor;
  readonly isCompleted: boolean;
  readonly isFailed: boolean;
  readonly activeSubGoalId?: string | undefined;
  readonly lastAction?: SubGoalFailureAction | undefined;
}

export interface TaskPlannerPort {
  createPlan(
    tenantContext: Readonly<TenantContext>,
    goalPrompt: string,
  ): Promise<AutonomousPlan>;

  executeStep(
    tenantContext: Readonly<TenantContext>,
    plan: AutonomousPlan,
    cursor: PlanExecutionCursor,
  ): Promise<PlanExecutionResult>;

  replan(
    tenantContext: Readonly<TenantContext>,
    failedPlan: AutonomousPlan,
    cursor: PlanExecutionCursor,
    failedSubGoalId: string,
  ): Promise<AutonomousPlan>;
}

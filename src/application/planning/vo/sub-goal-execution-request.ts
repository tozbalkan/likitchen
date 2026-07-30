import type { TenantContext } from '../../identity/tenant-context';

export interface SubGoalExecutionRequestProps {
  readonly planId: string;
  readonly planVersion: number;
  readonly subGoalId: string;
  readonly prompt: string;
  readonly tenantContext: TenantContext;
}

export class SubGoalExecutionRequest {
  readonly planId: string;
  readonly planVersion: number;
  readonly subGoalId: string;
  readonly prompt: string;
  readonly tenantContext: TenantContext;

  private constructor(props: Readonly<SubGoalExecutionRequestProps>) {
    if (!props.planId || props.planId.trim() === '') {
      throw new Error('[SubGoalExecutionRequest] planId is required.');
    }
    if (!props.subGoalId || props.subGoalId.trim() === '') {
      throw new Error('[SubGoalExecutionRequest] subGoalId is required.');
    }
    if (!props.prompt || props.prompt.trim() === '') {
      throw new Error('[SubGoalExecutionRequest] prompt is required.');
    }
    if (!props.tenantContext || !props.tenantContext.tenantId) {
      throw new Error('[SubGoalExecutionRequest] tenantContext is required.');
    }

    this.planId = props.planId;
    this.planVersion = props.planVersion;
    this.subGoalId = props.subGoalId;
    this.prompt = props.prompt;
    this.tenantContext = props.tenantContext;
    Object.freeze(this);
  }

  static create(
    props: Readonly<SubGoalExecutionRequestProps>,
  ): SubGoalExecutionRequest {
    return new SubGoalExecutionRequest(props);
  }
}

export interface ExecutionPlanProps {
  readonly planId: string;
  readonly agentId: string;
  readonly providerId: string;
  readonly model: string;
  readonly toolIds: readonly string[];
  readonly promptReference: string;
  readonly timeoutMs: number;
  readonly retryMaxAttempts: number;
  readonly tenantId: string;
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly createdAt: Date;
}

export class ExecutionPlan {
  readonly planId: string;
  readonly agentId: string;
  readonly providerId: string;
  readonly model: string;
  readonly toolIds: readonly string[];
  readonly promptReference: string;
  readonly timeoutMs: number;
  readonly retryMaxAttempts: number;
  readonly tenantId: string;
  readonly featureFlags: Readonly<Record<string, boolean>>;
  readonly createdAt: Date;

  private constructor(props: Readonly<ExecutionPlanProps>) {
    if (!props.planId || props.planId.trim() === '') {
      throw new Error('[ExecutionPlan] planId cannot be empty.');
    }
    this.planId = props.planId;
    this.agentId = props.agentId;
    this.providerId = props.providerId;
    this.model = props.model;
    this.toolIds = Object.freeze([...props.toolIds]);
    this.promptReference = props.promptReference;
    this.timeoutMs = props.timeoutMs;
    this.retryMaxAttempts = props.retryMaxAttempts;
    this.tenantId = props.tenantId;
    this.featureFlags = Object.freeze({ ...props.featureFlags });
    this.createdAt = props.createdAt;

    Object.freeze(this);
  }

  static create(props: Readonly<ExecutionPlanProps>): ExecutionPlan {
    return new ExecutionPlan(props);
  }
}

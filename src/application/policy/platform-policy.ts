import type { CorrelationId } from '../../shared/types';

export interface PlatformPolicyContext {
  readonly correlationId: CorrelationId;
  readonly tenantId: string;
}

export interface TimeoutPolicyProps {
  readonly timeoutMs: number;
}

export class TimeoutPolicy {
  readonly timeoutMs: number;

  private constructor(props: Readonly<TimeoutPolicyProps>) {
    if (props.timeoutMs <= 0) {
      throw new Error('[TimeoutPolicy] timeoutMs must be positive.');
    }
    this.timeoutMs = props.timeoutMs;
    Object.freeze(this);
  }

  static create(props: Readonly<TimeoutPolicyProps>): TimeoutPolicy {
    return new TimeoutPolicy(props);
  }

  static default(): TimeoutPolicy {
    return new TimeoutPolicy({ timeoutMs: 30000 });
  }
}

export interface ExecutionBudgetPolicyProps {
  readonly maxSteps: number;
  readonly maxDurationMs: number;
}

export class ExecutionBudgetPolicy {
  readonly maxSteps: number;
  readonly maxDurationMs: number;

  private constructor(props: Readonly<ExecutionBudgetPolicyProps>) {
    if (props.maxSteps <= 0) {
      throw new Error('[ExecutionBudgetPolicy] maxSteps must be positive.');
    }
    if (props.maxDurationMs <= 0) {
      throw new Error(
        '[ExecutionBudgetPolicy] maxDurationMs must be positive.',
      );
    }
    this.maxSteps = props.maxSteps;
    this.maxDurationMs = props.maxDurationMs;
    Object.freeze(this);
  }

  static create(
    props: Readonly<ExecutionBudgetPolicyProps>,
  ): ExecutionBudgetPolicy {
    return new ExecutionBudgetPolicy(props);
  }

  static default(): ExecutionBudgetPolicy {
    return new ExecutionBudgetPolicy({ maxSteps: 10, maxDurationMs: 60000 });
  }
}

import { ExecutionBudget } from './execution-budget';

export type RetryPolicyType = 'NONE' | 'FIXED' | 'EXPONENTIAL_BACKOFF';

export interface ToolExecutionPolicyProps {
  readonly timeoutMs: number;
  readonly retryPolicy: RetryPolicyType;
  readonly maxRetries: number;
  readonly retryBackoffMs: number;
  readonly circuitBreakerEnabled: boolean;
  readonly concurrencyLimit: number;
  readonly idempotent: boolean;
  readonly resultTtlMs?: number | undefined;
  readonly budget?: ExecutionBudget | undefined;
}

export class ToolExecutionPolicy {
  readonly timeoutMs: number;
  readonly retryPolicy: RetryPolicyType;
  readonly maxRetries: number;
  readonly retryBackoffMs: number;
  readonly circuitBreakerEnabled: boolean;
  readonly concurrencyLimit: number;
  readonly idempotent: boolean;
  readonly resultTtlMs?: number | undefined;
  readonly budget: ExecutionBudget;

  constructor(props: ToolExecutionPolicyProps) {
    this.timeoutMs = props.timeoutMs;
    this.retryPolicy = props.retryPolicy;
    this.maxRetries = props.maxRetries;
    this.retryBackoffMs = props.retryBackoffMs;
    this.circuitBreakerEnabled = props.circuitBreakerEnabled;
    this.concurrencyLimit = props.concurrencyLimit;
    this.idempotent = props.idempotent;
    this.resultTtlMs = props.resultTtlMs;
    this.budget = props.budget ?? ExecutionBudget.createDefault();
    Object.freeze(this);
  }

  static createDefault(): ToolExecutionPolicy {
    return new ToolExecutionPolicy({
      timeoutMs: 10000,
      retryPolicy: 'EXPONENTIAL_BACKOFF',
      maxRetries: 3,
      retryBackoffMs: 1000,
      circuitBreakerEnabled: true,
      concurrencyLimit: 10,
      idempotent: false,
    });
  }
}

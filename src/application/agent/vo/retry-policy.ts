import type { BackoffPolicy } from './backoff-policy';
import type { RetryDecisionPolicy } from './retry-decision-policy';
import { ConstantBackoff } from './backoff-policy';
import { TransientErrorRetryDecisionPolicy } from './retry-decision-policy';

export interface RetryPolicyProps {
  readonly maxAttempts?: number | undefined;
  readonly backoff?: BackoffPolicy | undefined;
  readonly decisionPolicy?: RetryDecisionPolicy | undefined;
}

export class RetryPolicy {
  readonly maxAttempts: number;
  readonly backoff: BackoffPolicy;
  readonly decisionPolicy: RetryDecisionPolicy;

  private constructor(props: Readonly<RetryPolicyProps>) {
    const attempts = props.maxAttempts ?? 3;
    if (attempts < 1) {
      throw new Error('[RetryPolicy] maxAttempts must be at least 1.');
    }

    this.maxAttempts = attempts;
    this.backoff = props.backoff ?? new ConstantBackoff(100);
    this.decisionPolicy =
      props.decisionPolicy ?? new TransientErrorRetryDecisionPolicy();
    Object.freeze(this);
  }

  static create(props: Readonly<RetryPolicyProps> = {}): RetryPolicy {
    return new RetryPolicy(props);
  }

  static default(): RetryPolicy {
    return new RetryPolicy({});
  }

  static noRetry(): RetryPolicy {
    return new RetryPolicy({ maxAttempts: 1 });
  }
}

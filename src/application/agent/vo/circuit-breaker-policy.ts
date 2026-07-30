export interface CircuitBreakerPolicyProps {
  readonly failureThreshold?: number | undefined;
  readonly resetTimeoutMs?: number | undefined;
}

export class CircuitBreakerPolicy {
  readonly failureThreshold: number;
  readonly resetTimeoutMs: number;

  private constructor(props: Readonly<CircuitBreakerPolicyProps>) {
    const threshold = props.failureThreshold ?? 5;
    const timeout = props.resetTimeoutMs ?? 30000;

    if (threshold < 1) {
      throw new Error(
        '[CircuitBreakerPolicy] failureThreshold must be at least 1.',
      );
    }
    if (timeout < 0) {
      throw new Error(
        '[CircuitBreakerPolicy] resetTimeoutMs cannot be negative.',
      );
    }

    this.failureThreshold = threshold;
    this.resetTimeoutMs = timeout;
    Object.freeze(this);
  }

  static create(
    props: Readonly<CircuitBreakerPolicyProps> = {},
  ): CircuitBreakerPolicy {
    return new CircuitBreakerPolicy(props);
  }

  static default(): CircuitBreakerPolicy {
    return new CircuitBreakerPolicy({});
  }
}

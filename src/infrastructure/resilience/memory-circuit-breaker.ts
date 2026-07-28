import {
  CircuitBreakerState,
  type CircuitBreakerPort,
} from '../../application/resilience/circuit-breaker-port';

export class CircuitBreakerOpenException extends Error {
  constructor(public readonly providerId: string) {
    super(
      `[CircuitBreaker] Circuit breaker is OPEN for provider '${providerId}'. Request rejected.`,
    );
    this.name = 'CircuitBreakerOpenException';
  }
}

export class MemoryCircuitBreaker implements CircuitBreakerPort {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failureCount = 0;
  private nextAttemptAt = 0;

  constructor(
    private readonly providerId: string,
    private readonly failureThreshold = 3,
    private readonly cooldownMs = 5000,
  ) {}

  getState(): CircuitBreakerState {
    if (
      this.state === CircuitBreakerState.OPEN &&
      Date.now() >= this.nextAttemptAt
    ) {
      this.state = CircuitBreakerState.HALF_OPEN;
    }
    return this.state;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    const currentState = this.getState();

    if (currentState === CircuitBreakerState.OPEN) {
      throw new CircuitBreakerOpenException(this.providerId);
    }

    try {
      const result = await fn();
      this.reset();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordFailure(): void {
    this.failureCount++;
    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptAt = Date.now() + this.cooldownMs;
    }
  }

  private reset(): void {
    this.failureCount = 0;
    this.state = CircuitBreakerState.CLOSED;
  }
}

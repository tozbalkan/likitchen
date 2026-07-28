export type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitRecord {
  state: CircuitBreakerState;
  failureCount: number;
  lastFailureTime?: number | undefined;
}

export class CircuitBreakerService {
  private readonly records = new Map<string, CircuitRecord>();

  constructor(
    private readonly failureThreshold: number = 3,
    private readonly resetTimeoutMs: number = 10000,
  ) {}

  getState(key: string): CircuitBreakerState {
    const record = this.records.get(key);
    if (!record) return 'CLOSED';

    if (record.state === 'OPEN') {
      const elapsed = Date.now() - (record.lastFailureTime ?? 0);
      if (elapsed > this.resetTimeoutMs) {
        record.state = 'HALF_OPEN';
        return 'HALF_OPEN';
      }
    }
    return record.state;
  }

  recordSuccess(key: string): void {
    const record = this.records.get(key);
    if (record) {
      record.state = 'CLOSED';
      record.failureCount = 0;
    }
  }

  recordFailure(key: string): void {
    let record = this.records.get(key);
    if (!record) {
      record = { state: 'CLOSED', failureCount: 0 };
      this.records.set(key, record);
    }

    record.failureCount += 1;
    record.lastFailureTime = Date.now();

    if (record.failureCount >= this.failureThreshold) {
      record.state = 'OPEN';
    }
  }
}

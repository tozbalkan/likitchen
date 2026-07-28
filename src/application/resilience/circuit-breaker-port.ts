export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerPort {
  execute<T>(fn: () => Promise<T>): Promise<T>;
  getState(): CircuitBreakerState;
}

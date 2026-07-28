export type HealthStatus = 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';

export interface ComponentHealthStatus {
  readonly name: string;
  readonly status: HealthStatus;
  readonly latencyMs: number;
  readonly checkedAt: Date;
  readonly details?: Readonly<Record<string, unknown>>;
}

export interface HealthCheckPort {
  checkHealth(): Promise<readonly ComponentHealthStatus[]>;
}

import type {
  HealthCheckPort,
  ComponentHealthStatus,
} from '../../application/resilience/health-check-port';

export interface ComponentHealthCheck {
  readonly name: string;
  check(): Promise<ComponentHealthStatus>;
}

export class HealthCheckAggregator implements HealthCheckPort {
  private readonly checks: ComponentHealthCheck[] = [];

  registerCheck(check: ComponentHealthCheck): void {
    this.checks.push(check);
  }

  async checkHealth(): Promise<readonly ComponentHealthStatus[]> {
    const results: ComponentHealthStatus[] = [];
    for (const check of this.checks) {
      try {
        results.push(await check.check());
      } catch (error) {
        results.push({
          name: check.name,
          status: 'UNHEALTHY',
          latencyMs: 0,
          checkedAt: new Date(),
          details: { error: (error as Error).message },
        });
      }
    }
    return results;
  }
}

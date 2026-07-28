import type { HealthCheckPort } from './health-check-port';

export class ApplicationHost {
  private running = false;

  constructor(private readonly healthCheckPort?: HealthCheckPort) {}

  async start(): Promise<void> {
    this.running = true;
  }

  async stop(): Promise<void> {
    this.running = false;
  }

  async dispose(): Promise<void> {
    await this.stop();
  }

  isLive(): boolean {
    return this.running;
  }

  async isReady(): Promise<boolean> {
    if (!this.running) return false;
    if (!this.healthCheckPort) return true;
    const statuses = await this.healthCheckPort.checkHealth();
    return statuses.every((s) => s.status !== 'UNHEALTHY');
  }

  async isHealthy(): Promise<boolean> {
    return await this.isReady();
  }
}

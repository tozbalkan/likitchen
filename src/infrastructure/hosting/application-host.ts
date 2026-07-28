import type { InfrastructureComponent } from '../../application/operations/infrastructure-component';
import type { HealthCheckPort } from '../../application/resilience/health-check-port';
import type { ComponentHealthStatus } from '../../application/resilience/health-check-port';
import type { LifecycleEvent, LifecycleListener } from './lifecycle-events';

export class ApplicationHost implements HealthCheckPort {
  private readonly components: readonly InfrastructureComponent[];
  private readonly listeners: LifecycleListener[] = [];
  private running = false;
  private ready = false;
  private readonly startedAt: number;

  constructor(components: readonly InfrastructureComponent[]) {
    this.components = components;
    this.startedAt = Date.now();
  }

  onLifecycleEvent(listener: LifecycleListener): void {
    this.listeners.push(listener);
  }

  private emit(event: LifecycleEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  async start(): Promise<void> {
    this.emit('starting');
    for (const component of this.components) {
      await component.start();
    }
    this.running = true;
    this.emit('started');
    this.ready = true;
    this.emit('ready');
  }

  async stop(): Promise<void> {
    this.emit('stopping');
    this.ready = false;
    // Stop in reverse order (LIFO)
    for (let i = this.components.length - 1; i >= 0; i--) {
      await this.components[i]!.stop();
    }
    this.running = false;
    this.emit('stopped');
  }

  async dispose(): Promise<void> {
    if (this.running) {
      await this.stop();
    }
    for (let i = this.components.length - 1; i >= 0; i--) {
      await this.components[i]!.dispose();
    }
    this.emit('disposed');
  }

  isLive(): boolean {
    return this.running;
  }

  isReady(): boolean {
    return this.ready;
  }

  async isHealthy(): Promise<boolean> {
    if (!this.running) return false;
    const statuses = await this.checkHealth();
    return statuses.every((s) => s.status !== 'UNHEALTHY');
  }

  async checkHealth(): Promise<readonly ComponentHealthStatus[]> {
    const results: ComponentHealthStatus[] = [];
    for (const component of this.components) {
      results.push(await component.health());
    }
    return results;
  }

  getUptimeMs(): number {
    return Date.now() - this.startedAt;
  }

  getComponentNames(): readonly string[] {
    return this.components.map((c) => c.name);
  }
}

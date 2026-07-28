import { describe, it, expect } from 'vitest';
import { ApplicationHost } from './application-host';
import type { InfrastructureComponent } from '../../application/operations/infrastructure-component';
import type { ComponentHealthStatus } from '../../application/resilience/health-check-port';
import type { LifecycleEvent } from './lifecycle-events';

function createMockComponent(
  name: string,
  healthStatus: ComponentHealthStatus['status'] = 'HEALTHY',
): InfrastructureComponent & {
  started: boolean;
  stopped: boolean;
  disposed: boolean;
} {
  const mock = {
    name,
    started: false,
    stopped: false,
    disposed: false,
    async start() {
      mock.started = true;
    },
    async stop() {
      mock.stopped = true;
    },
    async dispose() {
      mock.disposed = true;
    },
    async health(): Promise<ComponentHealthStatus> {
      return {
        name,
        status: healthStatus,
        latencyMs: 1,
        checkedAt: new Date(),
      };
    },
  };
  return mock;
}

describe('ApplicationHost', () => {
  it('starts all components and becomes live/ready', async () => {
    const db = createMockComponent('database');
    const cache = createMockComponent('cache');
    const host = new ApplicationHost([db, cache]);

    await host.start();

    expect(db.started).toBe(true);
    expect(cache.started).toBe(true);
    expect(host.isLive()).toBe(true);
    expect(host.isReady()).toBe(true);
  });

  it('stops all components in reverse order', async () => {
    const order: string[] = [];
    const first: InfrastructureComponent = {
      name: 'first',
      async start() {},
      async stop() {
        order.push('first');
      },
      async dispose() {},
      async health() {
        return {
          name: 'first',
          status: 'HEALTHY',
          latencyMs: 0,
          checkedAt: new Date(),
        };
      },
    };
    const second: InfrastructureComponent = {
      name: 'second',
      async start() {},
      async stop() {
        order.push('second');
      },
      async dispose() {},
      async health() {
        return {
          name: 'second',
          status: 'HEALTHY',
          latencyMs: 0,
          checkedAt: new Date(),
        };
      },
    };

    const host = new ApplicationHost([first, second]);
    await host.start();
    await host.stop();

    expect(order).toEqual(['second', 'first']);
    expect(host.isLive()).toBe(false);
    expect(host.isReady()).toBe(false);
  });

  it('disposes all components and stops first if still running', async () => {
    const db = createMockComponent('database');
    const host = new ApplicationHost([db]);

    await host.start();
    await host.dispose();

    expect(db.stopped).toBe(true);
    expect(db.disposed).toBe(true);
    expect(host.isLive()).toBe(false);
  });

  it('reports unhealthy when any component is UNHEALTHY', async () => {
    const healthy = createMockComponent('cache', 'HEALTHY');
    const unhealthy = createMockComponent('database', 'UNHEALTHY');
    const host = new ApplicationHost([healthy, unhealthy]);

    await host.start();

    expect(await host.isHealthy()).toBe(false);
    const statuses = await host.checkHealth();
    expect(statuses).toHaveLength(2);
  });

  it('emits lifecycle events in correct order', async () => {
    const events: LifecycleEvent[] = [];
    const host = new ApplicationHost([createMockComponent('db')]);
    host.onLifecycleEvent((e) => events.push(e));

    await host.start();
    await host.stop();
    await host.dispose();

    expect(events).toEqual([
      'starting',
      'started',
      'ready',
      'stopping',
      'stopped',
      'disposed',
    ]);
  });

  it('tracks uptime and component names', async () => {
    const host = new ApplicationHost([
      createMockComponent('redis'),
      createMockComponent('postgres'),
    ]);

    expect(host.getComponentNames()).toEqual(['redis', 'postgres']);
    expect(host.getUptimeMs()).toBeGreaterThanOrEqual(0);
  });
});

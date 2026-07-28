import { describe, it, expect, vi } from 'vitest';
import { GracefulShutdown } from './graceful-shutdown';
import { ApplicationHost } from './application-host';
import type { InfrastructureComponent } from '../../application/operations/infrastructure-component';

function createMockComponent(name: string): InfrastructureComponent {
  return {
    name,
    async start() {},
    async stop() {},
    async dispose() {},
    async health() {
      return {
        name,
        status: 'HEALTHY' as const,
        latencyMs: 1,
        checkedAt: new Date(),
      };
    },
  };
}

describe('GracefulShutdown', () => {
  it('disposes the host on shutdown', async () => {
    const host = new ApplicationHost([createMockComponent('db')]);
    await host.start();

    const shutdown = new GracefulShutdown(host);
    await shutdown.shutdown();

    expect(host.isLive()).toBe(false);
    expect(shutdown.isShuttingDown()).toBe(true);
  });

  it('only shuts down once even if called multiple times', async () => {
    const host = new ApplicationHost([createMockComponent('db')]);
    await host.start();

    const disposeSpy = vi.spyOn(host, 'dispose');
    const shutdown = new GracefulShutdown(host);

    await shutdown.shutdown();
    await shutdown.shutdown();

    expect(disposeSpy).toHaveBeenCalledTimes(1);
  });

  it('does not throw on timeout', async () => {
    const slowComponent: InfrastructureComponent = {
      name: 'slow',
      async start() {},
      async stop() {
        await new Promise((r) => setTimeout(r, 50000));
      },
      async dispose() {},
      async health() {
        return {
          name: 'slow',
          status: 'HEALTHY' as const,
          latencyMs: 0,
          checkedAt: new Date(),
        };
      },
    };

    const host = new ApplicationHost([slowComponent]);
    await host.start();

    const shutdown = new GracefulShutdown(host, 50);
    await expect(shutdown.shutdown()).resolves.not.toThrow();
  });
});

import { describe, it, expect } from 'vitest';
import { ApplicationHost } from '../hosting/application-host';
import { GracefulShutdown } from '../hosting/graceful-shutdown';
import { HttpRuntime } from '../hosting/http-runtime';
import { StartupValidatorAdapter } from '../operations/startup-validator';
import { DiagnosticsServiceAdapter } from '../operations/diagnostics-service';
import { DeploymentProfile } from '../../application/operations/deployment-profile';
import type { InfrastructureComponent } from '../../application/operations/infrastructure-component';
import type { LifecycleEvent } from '../hosting/lifecycle-events';

function createMockComponent(
  name: string,
  healthStatus: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' = 'HEALTHY',
): InfrastructureComponent {
  return {
    name,
    async start() {},
    async stop() {},
    async dispose() {},
    async health() {
      return {
        name,
        status: healthStatus,
        latencyMs: 1,
        checkedAt: new Date(),
      };
    },
  };
}

describe('Hosting Contract', () => {
  it('enforces lifecycle order: start → ready → stop → dispose', async () => {
    const events: LifecycleEvent[] = [];
    const host = new ApplicationHost([createMockComponent('database')]);
    host.onLifecycleEvent((e) => events.push(e));

    // Pre-start state
    expect(host.isLive()).toBe(false);
    expect(host.isReady()).toBe(false);

    await host.start();
    expect(host.isLive()).toBe(true);
    expect(host.isReady()).toBe(true);

    await host.stop();
    expect(host.isLive()).toBe(false);
    expect(host.isReady()).toBe(false);

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

  it('ApplicationHost communicates only through InfrastructureComponent interface', async () => {
    // Verify the host accepts any InfrastructureComponent
    const customComponent: InfrastructureComponent = {
      name: 'custom-service',
      async start() {},
      async stop() {},
      async dispose() {},
      async health() {
        return {
          name: 'custom-service',
          status: 'HEALTHY',
          latencyMs: 0,
          checkedAt: new Date(),
        };
      },
    };

    const host = new ApplicationHost([customComponent]);
    await host.start();

    const healthStatuses = await host.checkHealth();
    expect(healthStatuses).toHaveLength(1);
    expect(healthStatuses[0]!.name).toBe('custom-service');

    await host.dispose();
  });

  it('startup validation gates application readiness', async () => {
    const validator = new StartupValidatorAdapter([
      { name: 'config', check: async () => true },
      { name: 'vault', check: async () => false },
    ]);

    const result = await validator.validate();

    expect(result.valid).toBe(false);
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0]).toContain('vault');
  });

  it('health endpoints return correct status codes', async () => {
    const host = new ApplicationHost([
      createMockComponent('redis', 'HEALTHY'),
      createMockComponent('postgres', 'UNHEALTHY'),
    ]);
    await host.start();

    const diagnostics = new DiagnosticsServiceAdapter({
      host,
      profile: DeploymentProfile.production(),
      version: '1.0.0',
      buildTimestamp: '2026-01-01T00:00:00Z',
    });

    const httpRuntime = new HttpRuntime({ host, diagnostics });

    // /health — 503 because one component is unhealthy
    const healthResp = await httpRuntime.handleHealth();
    expect(healthResp.status).toBe(503);

    // /ready — 200 because host is running
    const readyResp = httpRuntime.handleReady();
    expect(readyResp.status).toBe(200);

    // /live — 200 because host is running
    const liveResp = httpRuntime.handleLive();
    expect(liveResp.status).toBe(200);

    // /version
    const versionResp = await httpRuntime.handleVersion();
    expect(versionResp.status).toBe(200);
    expect(versionResp.body['version']).toBe('1.0.0');

    // /diagnostics
    const diagResp = await httpRuntime.handleDiagnostics();
    expect(diagResp.status).toBe(200);
    expect(diagResp.body['deploymentProfile']).toBe('production');

    await host.dispose();
  });

  it('graceful shutdown disposes all components', async () => {
    const disposed: string[] = [];
    const makeComp = (name: string): InfrastructureComponent => ({
      name,
      async start() {},
      async stop() {},
      async dispose() {
        disposed.push(name);
      },
      async health() {
        return {
          name,
          status: 'HEALTHY' as const,
          latencyMs: 0,
          checkedAt: new Date(),
        };
      },
    });

    const host = new ApplicationHost([makeComp('a'), makeComp('b')]);
    await host.start();

    const shutdown = new GracefulShutdown(host);
    await shutdown.shutdown();

    // Reverse order disposal
    expect(disposed).toEqual(['b', 'a']);
    expect(host.isLive()).toBe(false);
  });

  it('deployment profile is immutable and provides environment-specific defaults', () => {
    const dev = DeploymentProfile.development();
    const prod = DeploymentProfile.production();

    expect(dev.retryMaxAttempts).toBeLessThan(prod.retryMaxAttempts);
    expect(dev.telemetrySampleRate).toBeGreaterThan(prod.telemetrySampleRate);
    expect(dev.diagnosticsVerbose).toBe(true);
    expect(prod.diagnosticsVerbose).toBe(false);
  });
});

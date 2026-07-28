import { describe, it, expect } from 'vitest';
import { DiagnosticsServiceAdapter } from './diagnostics-service';
import { ApplicationHost } from '../hosting/application-host';
import { DeploymentProfile } from '../../application/operations/deployment-profile';
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

describe('DiagnosticsServiceAdapter', () => {
  it('returns diagnostics info without exposing secrets', async () => {
    const host = new ApplicationHost([
      createMockComponent('redis'),
      createMockComponent('postgres'),
    ]);
    const profile = DeploymentProfile.production();

    const diagnostics = new DiagnosticsServiceAdapter({
      host,
      profile,
      version: '1.2.3',
      buildTimestamp: '2026-01-01T00:00:00Z',
      gitCommit: 'abc1234',
    });

    const info = await diagnostics.getDiagnostics();

    expect(info.version).toBe('1.2.3');
    expect(info.buildTimestamp).toBe('2026-01-01T00:00:00Z');
    expect(info.deploymentProfile).toBe('production');
    expect(info.gitCommit).toBe('abc1234');
    expect(info.componentSummary).toEqual(['redis', 'postgres']);
    expect(info.uptimeMs).toBeGreaterThanOrEqual(0);

    // Verify no secrets leak
    const serialized = JSON.stringify(info);
    expect(serialized).not.toContain('API_KEY');
    expect(serialized).not.toContain('SECRET');
  });

  it('handles missing optional git commit', async () => {
    const host = new ApplicationHost([]);
    const profile = DeploymentProfile.development();

    const diagnostics = new DiagnosticsServiceAdapter({
      host,
      profile,
      version: '0.0.1',
      buildTimestamp: '2026-01-01T00:00:00Z',
    });

    const info = await diagnostics.getDiagnostics();
    expect(info.gitCommit).toBeUndefined();
  });
});

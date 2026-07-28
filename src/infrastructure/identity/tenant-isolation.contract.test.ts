import { describe, it, expect } from 'vitest';
import { TenantContext } from '../../application/identity/tenant-context';
import {
  UseCaseGuard,
  UnauthorizedException,
} from '../../application/identity/auth/use-case-guard';
import { MemoryPermissionEvaluatorAdapter } from './memory-permission-evaluator';
import { MemoryQuotaManagerAdapter } from './memory-quota-manager';
import { TenantPartitionedReplayStoreAdapter } from './tenant-partitioned-replay-store';
import type { ReplaySnapshot } from '../../application/intelligence/replay/replay-session';

describe('Tenant Isolation & Authorization Contract Test', () => {
  it('throws error when creating TenantContext with empty tenantId', () => {
    expect(() =>
      TenantContext.create({
        tenantId: '',
        organizationId: 'org-1',
        workspaceId: 'ws-1',
        environment: 'production',
        region: 'eu-west-1',
      }),
    ).toThrow('[TenantContext] tenantId cannot be empty.');
  });

  it('evaluates RBAC permissions via UseCaseGuard correctly', async () => {
    const evaluator = new MemoryPermissionEvaluatorAdapter({
      'tenant-admin': 'ADMIN',
      'tenant-viewer': 'VIEWER',
    });
    const guard = new UseCaseGuard(evaluator);

    const adminCtx = TenantContext.create({
      tenantId: 'tenant-admin',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      environment: 'production',
      region: 'us-east-1',
    });

    const viewerCtx = TenantContext.create({
      tenantId: 'tenant-viewer',
      organizationId: 'org-1',
      workspaceId: 'ws-1',
      environment: 'production',
      region: 'us-east-1',
    });

    await expect(
      guard.authorize(adminCtx, 'conversation.start'),
    ).resolves.not.toThrow();
    await expect(
      guard.authorize(viewerCtx, 'conversation.start'),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('enforces tenant-specific financial dollar budget limits', async () => {
    const quotaAdapter = new MemoryQuotaManagerAdapter();
    quotaAdapter.setTenantQuota('tenant-small', {
      monthlyCostLimitUsd: 10,
      maxRequestsPerMinute: 60,
      currentMonthlyCostUsd: 9.99,
    });

    const context = TenantContext.create({
      tenantId: 'tenant-small',
      organizationId: 'org-small',
      workspaceId: 'ws-small',
      environment: 'production',
      region: 'us-east-1',
    });

    const decision = await quotaAdapter.checkQuota(context, 0.05); // 9.99 + 0.05 = 10.04 > 10.00
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Monthly dollar budget exceeded');
  });

  it('guarantees zero replay snapshot data leakage across tenant boundaries', async () => {
    const replayStore = new TenantPartitionedReplayStoreAdapter();

    const tenantA = TenantContext.create({
      tenantId: 'company-a',
      organizationId: 'org-a',
      workspaceId: 'ws-a',
      environment: 'production',
      region: 'eu-central-1',
    });

    const tenantB = TenantContext.create({
      tenantId: 'company-b',
      organizationId: 'org-b',
      workspaceId: 'ws-b',
      environment: 'production',
      region: 'eu-central-1',
    });

    const snapshotA: ReplaySnapshot = {
      sessionId: 'shared-session-id',
      turnId: 'turn-1',
      promptFingerprint: 'fp-a',
      providerResult: {
        value: 'Secret Data Company A',
        metadata: {
          providerId: 'openai',
          model: 'gpt-4o',
          promptFingerprint: 'fp-a',
        },
      },
      recordedAt: new Date(),
    };

    await replayStore.recordSnapshot(tenantA, snapshotA);

    // Tenant A can load its replay session
    const sessionA = await replayStore.getSession(tenantA, 'shared-session-id');
    expect(sessionA).not.toBeNull();
    expect(sessionA?.snapshots[0]?.providerResult.value).toBe(
      'Secret Data Company A',
    );

    // Tenant B cannot load Tenant A's replay session!
    const sessionB = await replayStore.getSession(tenantB, 'shared-session-id');
    expect(sessionB).toBeNull();
  });
});

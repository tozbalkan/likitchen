import { describe, it, expect } from 'vitest';
import { buildApplication } from '../../bootstrap/build-application';
import { AgentRunner } from '../../application/agent/agent-runner';
import { AgentDefinition } from '../../application/agent/agent-definition';
import { ExecutionContext } from '../../application/context/execution-context';
import { TenantContext } from '../../application/identity/tenant-context';
import type { TenantPartitionedReplayStoreAdapter } from '../identity/tenant-partitioned-replay-store';

describe('Agent Runtime Contract Tests', () => {
  it('enforces tenant isolation across execution sessions', async () => {
    const registry = await buildApplication();
    const runner = registry.resolve<AgentRunner>('AgentRunner');

    const agentDef = AgentDefinition.create({
      id: 'agent-tenant-test',
      name: 'Tenant Test Agent',
      version: '1.0.0',
      systemPromptReference: 'prompts/tenant-test',
      toolIds: [],
      modelSelectionPolicy: 'primary-first',
      memoryPolicy: 'default',
      toolPolicy: 'default',
      guardPolicy: 'default',
    });

    const tenantA = TenantContext.create({
      tenantId: 'tenant-alpha',
      organizationId: 'org-alpha',
      workspaceId: 'ws-alpha',
      environment: 'production',
      region: 'eu-west-1',
    });

    const tenantB = TenantContext.create({
      tenantId: 'tenant-beta',
      organizationId: 'org-beta',
      workspaceId: 'ws-beta',
      environment: 'production',
      region: 'us-west-2',
    });

    const ctxA = ExecutionContext.create({
      correlationId: 'session-alpha-1',
      traceId: 'trace-a',
    });
    const ctxB = ExecutionContext.create({
      correlationId: 'session-beta-1',
      traceId: 'trace-b',
    });

    const resultA = await runner.run(agentDef, ctxA, tenantA, 'Alpha payload');
    const resultB = await runner.run(agentDef, ctxB, tenantB, 'Beta payload');

    expect(resultA.sessionId).toBe('session-alpha-1');
    expect(resultB.sessionId).toBe('session-beta-1');
    expect(resultA.traceId).not.toBe(resultB.traceId);
  });

  it('records replay snapshots in finally block during runtime execution', async () => {
    const registry = await buildApplication();
    const runner = registry.resolve<AgentRunner>('AgentRunner');
    const replayStore =
      registry.resolve<TenantPartitionedReplayStoreAdapter>(
        'TenantReplayStore',
      );

    const agentDef = AgentDefinition.create({
      id: 'agent-replay-test',
      name: 'Replay Agent',
      version: '1.0.0',
      systemPromptReference: 'prompts/replay',
      toolIds: [],
      modelSelectionPolicy: 'primary-first',
      memoryPolicy: 'default',
      toolPolicy: 'default',
      guardPolicy: 'default',
    });

    const tenant = TenantContext.create({
      tenantId: 'tenant-replay',
      organizationId: 'org-replay',
      workspaceId: 'ws-replay',
      environment: 'test',
      region: 'us-east-1',
    });

    const ctx = ExecutionContext.create({
      correlationId: 'replay-session-999',
      traceId: 'trace-999',
    });
    await runner.run(agentDef, ctx, tenant, 'Replay input');

    // Retrieve replay session
    const recordedSession = await replayStore.getSession(
      tenant,
      'replay-session-999',
    );
    expect(recordedSession).not.toBeNull();
    expect(recordedSession?.snapshots).toHaveLength(1);
    expect(recordedSession?.snapshots[0]?.sessionId).toBe('replay-session-999');
  });
});

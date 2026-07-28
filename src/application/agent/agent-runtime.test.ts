import { describe, it, expect } from 'vitest';
import { buildApplication } from '../../bootstrap/build-application';
import { AgentDefinition } from './agent-definition';
import { AgentRunner } from './agent-runner';
import { ExecutionContext } from '../context/execution-context';
import { TenantContext } from '../identity/tenant-context';
import { CancellationToken } from './cancellation-token';

describe('AgentRuntime & AgentRunner', () => {
  it('executes a full agent pipeline deterministically', async () => {
    const registry = await buildApplication();
    const runner = registry.resolve<AgentRunner>('AgentRunner');

    const agentDef = AgentDefinition.create({
      id: 'agent-1',
      name: 'Test Assistant Agent',
      version: '1.0.0',
      systemPromptReference: 'prompts/test-assistant',
      toolIds: ['tool-weather'],
      modelSelectionPolicy: 'primary-first',
      memoryPolicy: 'default',
      toolPolicy: 'default',
      guardPolicy: 'default',
      timeoutMs: 5000,
    });

    const execContext = ExecutionContext.create({
      correlationId: 'corr-agent-123',
      traceId: 'trace-agent-123',
    });

    const tenantContext = TenantContext.create({
      tenantId: 'tenant-acme',
      organizationId: 'org-acme',
      workspaceId: 'ws-main',
      environment: 'test',
      region: 'eu-central-1',
    });

    const result = await runner.run(
      agentDef,
      execContext,
      tenantContext,
      'Hello Agent Runtime!',
    );

    expect(result.sessionId).toBe('corr-agent-123');
    expect(result.status).toBe('COMPLETED');
    expect(result.outcome.responseText).toBeDefined();
    expect(result.metrics.totalLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('handles pipeline cancellation gracefully', async () => {
    const registry = await buildApplication();
    const runner = registry.resolve<AgentRunner>('AgentRunner');

    const agentDef = AgentDefinition.create({
      id: 'agent-cancel',
      name: 'Cancelled Agent',
      version: '1.0.0',
      systemPromptReference: 'prompts/cancel',
      toolIds: [],
      modelSelectionPolicy: 'primary-first',
      memoryPolicy: 'default',
      toolPolicy: 'default',
      guardPolicy: 'default',
    });

    const execContext = ExecutionContext.create({
      correlationId: 'corr-cancel-1',
      traceId: 'trace-cancel-1',
    });

    const tenantContext = TenantContext.create({
      tenantId: 'tenant-cancel',
      organizationId: 'org-cancel',
      workspaceId: 'ws-cancel',
      environment: 'test',
      region: 'us-east-1',
    });

    const cancellationToken = new CancellationToken();
    cancellationToken.cancel('User requested shutdown');

    await expect(
      runner.run(
        agentDef,
        execContext,
        tenantContext,
        'Should cancel',
        cancellationToken,
      ),
    ).rejects.toThrow('User requested shutdown');
  });
});

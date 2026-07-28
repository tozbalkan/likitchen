import { describe, it, expect } from 'vitest';
import { buildApplication } from '../../bootstrap/build-application';
import { AgentRunner } from '../../application/agent/agent-runner';
import { AgentDefinition } from '../../application/agent/agent-definition';
import { ExecutionContext } from '../../application/context/execution-context';
import { TenantContext } from '../../application/identity/tenant-context';
import type { PromptRepositoryPort } from '../../application/prompt/ports/prompt-repository-port';
import type { PromptPublisherPort } from '../../application/prompt/ports/prompt-publisher-port';
import { PromptDefinition } from '../../application/prompt/prompt-definition';
import { PromptDocument } from '../../application/prompt/prompt-document';
import { PromptVersion } from '../../application/prompt/prompt-version';
import { PromptEnvironmentPointer } from '../../application/prompt/prompt-environment';
import { PromotionEvent } from '../../application/prompt/promotion-event';

describe('Prompt Studio & Prompt Management Platform Contract Tests', () => {
  it('enforces tenant isolation — Tenant A cannot resolve Tenant B prompts', async () => {
    const registry = await buildApplication();
    const repository = registry.resolve<PromptRepositoryPort>(
      'PromptRepositoryPort',
    );

    const tenantA = TenantContext.create({
      tenantId: 'tenant-studio-a',
      organizationId: 'org-a',
      workspaceId: 'ws-a',
      environment: 'production',
      region: 'us-east-1',
    });

    const tenantB = TenantContext.create({
      tenantId: 'tenant-studio-b',
      organizationId: 'org-b',
      workspaceId: 'ws-b',
      environment: 'production',
      region: 'us-east-1',
    });

    const defA = PromptDefinition.create({
      id: 'p-def-a',
      namespace: 'core',
      name: 'tenant-prompt',
      description: 'Tenant A Prompt',
      currentVersionId: 'v-a-1',
      tags: ['tenant-a'],
      owner: 'team-a',
      createdAt: new Date(),
    });

    await repository.saveDefinition(tenantA, defA);

    // Tenant A can resolve definition
    const resolvedA = await repository.findDefinition(
      tenantA,
      'core',
      'tenant-prompt',
    );
    expect(resolvedA).toBeDefined();

    // Tenant B cannot resolve Tenant A definition
    const resolvedB = await repository.findDefinition(
      tenantB,
      'core',
      'tenant-prompt',
    );
    expect(resolvedB).toBeUndefined();
  });

  it('integrates seamlessly with AgentRuntime (Capability-020) without modifying runtime interfaces', async () => {
    const registry = await buildApplication();
    const runner = registry.resolve<AgentRunner>('AgentRunner');
    const repository = registry.resolve<PromptRepositoryPort>(
      'PromptRepositoryPort',
    );
    const publisher = registry.resolve<PromptPublisherPort>(
      'PromptPublisherPort',
    );

    const tenant = TenantContext.create({
      tenantId: 'tenant-runtime-integration',
      organizationId: 'org-integration',
      workspaceId: 'ws-integration',
      environment: 'production',
      region: 'eu-west-1',
    });

    // 1. Create prompt definition, document, and version in repository
    const def = PromptDefinition.create({
      id: 'p-runtime-1',
      namespace: 'core',
      name: 'assistant-greeting',
      description: 'Assistant greeting prompt',
      currentVersionId: 'v-rt-1',
      tags: ['production'],
      owner: 'ai-team',
      createdAt: new Date(),
    });

    const doc = PromptDocument.create({
      id: 'doc-rt-1',
      systemTemplate: 'You are {{agent_name}} operating in {{environment}}.',
      userTemplate: 'Help me with {{task}}.',
      variables: ['agent_name', 'environment', 'task'],
    });

    const version = PromptVersion.create({
      id: 'v-rt-1',
      promptId: 'p-runtime-1',
      version: '1.0.0',
      document: doc,
      status: 'DRAFT',
      createdAt: new Date(),
    });

    await repository.saveDefinition(tenant, def);
    await repository.saveVersion(tenant, version, doc);
    await publisher.publish(tenant, 'v-rt-1');

    // 2. Set environment pointer for production
    const pointer = new PromptEnvironmentPointer({
      promptId: 'p-runtime-1',
      environment: 'production',
      activeVersionId: 'v-rt-1',
      activeVersionNumber: '1.0.0',
      promotionHistory: [
        PromotionEvent.create({
          id: 'pe-1',
          promptId: 'p-runtime-1',
          fromVersion: '0.0.0',
          toVersion: '1.0.0',
          environment: 'production',
          actor: 'admin',
          reason: 'Initial production release',
          timestamp: new Date(),
        }),
      ],
      lastUpdated: new Date(),
    });
    await repository.saveEnvironmentPointer(tenant, pointer);

    // 3. Execute via AgentRunner with prompt reference "core/assistant-greeting:production"
    const agentDef = AgentDefinition.create({
      id: 'agent-studio-integrated',
      name: 'Integrated Studio Agent',
      version: '1.0.0',
      systemPromptReference: 'core/assistant-greeting:production',
      toolIds: [],
      modelSelectionPolicy: 'primary-first',
      memoryPolicy: 'default',
      toolPolicy: 'default',
      guardPolicy: 'default',
    });

    const execCtx = ExecutionContext.create({
      correlationId: 'session-studio-int-1',
      traceId: 'trace-studio-int-1',
    });

    const result = await runner.run(
      agentDef,
      execCtx,
      tenant,
      'Execute prompt studio task',
    );

    expect(result.status).toBe('COMPLETED');
    expect(result.sessionId).toBe('session-studio-int-1');
  });
});

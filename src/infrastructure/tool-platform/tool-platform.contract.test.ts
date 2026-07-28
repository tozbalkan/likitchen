import { describe, it, expect } from 'vitest';
import { buildApplication } from '../../bootstrap/build-application';
import { TenantContext } from '../../application/identity/tenant-context';
import type { ToolRegistryRepositoryPort } from '../../application/tool-platform/ports/tool-registry-repository-port';
import type { ToolResolver } from '../../application/tool-platform/services/tool-resolver';
import type { ProviderSelectorService } from '../../application/tool-platform/services/provider-selector-service';
import type { ToolExecutionPipeline } from '../../application/tool-platform/pipeline/tool-execution-pipeline';
import type { OutboxPort as ToolOutboxPort } from '../../application/tool-platform/ports/outbox-port';
import { RegisterToolDefinitionCommandHandler } from '../../application/tool-platform/commands/register-tool-definition.command';
import { CreateToolInstanceCommandHandler } from '../../application/tool-platform/commands/create-tool-instance.command';
import { ExecuteToolCommandHandler } from '../../application/tool-platform/commands/execute-tool.command';

describe('Capability-023 Tool Registry & Tool Execution Platform Contract Tests', () => {
  it('assembles composition root, registers tool definition & instance, executes pipeline via ProviderDriver, and records outbox events with zero regressions', async () => {
    const registry = await buildApplication();

    const repository = registry.resolve<ToolRegistryRepositoryPort>(
      'ToolRegistryRepositoryPort',
    );
    const resolver = registry.resolve<ToolResolver>('ToolResolver');
    const providerSelector = registry.resolve<ProviderSelectorService>(
      'ProviderSelectorService',
    );
    const pipeline = registry.resolve<ToolExecutionPipeline>(
      'ToolExecutionPipeline',
    );
    const outbox = registry.resolve<ToolOutboxPort>('ToolOutboxPort');

    const tenant = TenantContext.create({
      tenantId: 'tenant-tool-contract',
      organizationId: 'org-contract',
      workspaceId: 'ws-contract',
      environment: 'production',
      region: 'eu-west-1',
    });

    // 1. Register ToolDefinition via Command
    const registerDefHandler = new RegisterToolDefinitionCommandHandler(
      repository,
    );
    await registerDefHandler.execute({
      toolId: 'tool-contract-mcp',
      name: 'MCP Contract Tool',
      description: 'Contract test tool for MCP',
      category: 'MCP',
      provider: 'mcp-provider',
      version: '1.0.0',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      tenantContext: tenant,
    });

    // 2. Create Tenant ToolInstance
    const createInstHandler = new CreateToolInstanceCommandHandler(repository);
    const inst = await createInstHandler.execute({
      instanceId: 'inst-mcp-contract-1',
      toolId: 'tool-contract-mcp',
      version: '1.0.0',
      endpointUrl: 'mcp://localhost:8080',
      tenantContext: tenant,
    });
    expect(inst.enabled).toBe(true);

    // 3. Resolve Tool
    const resolved = await resolver.resolveTool(
      tenant,
      'tool-contract-mcp',
      '1.0.0',
    );
    expect(resolved.definition.name).toBe('MCP Contract Tool');
    expect(resolved.instance.endpointUrl).toBe('mcp://localhost:8080');

    // 4. Verify ProviderDriver capabilities
    const driver = providerSelector.selectDriver('mcp-provider');
    const caps = await driver.getCapabilities();
    expect(caps.supportsStreaming).toBe(true);
    expect(caps.supportsFiles).toBe(true);

    // 5. Execute Tool Command through 10-stage pipeline
    const executeHandler = new ExecuteToolCommandHandler(resolver, pipeline);
    const result = await executeHandler.execute({
      toolId: 'tool-contract-mcp',
      payload: { query: 'SELECT * FROM metrics' },
      tenantContext: tenant,
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.output['result']).toContain('MCP tool execution output');
    expect(result.normalizedOutput?.['__normalizedAt']).toBeDefined();

    // 6. Verify Outbox Event recorded
    const events = await outbox.getPendingEvents();
    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]?.eventType).toBe('ToolExecuted');
  });
});

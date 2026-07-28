import { describe, it, expect } from 'vitest';
import { InMemoryToolRegistryRepositoryAdapter } from './in-memory-tool-registry-repository';
import { TenantContext } from '../../application/identity/tenant-context';
import { RegisterToolDefinitionCommandHandler } from '../../application/tool-platform/commands/register-tool-definition.command';
import { ToolResolver } from '../../application/tool-platform/services/tool-resolver';
import { ProviderSelectorService } from '../../application/tool-platform/services/provider-selector-service';
import { HTTPProviderDriver } from '../../application/tool-platform/drivers/http-provider-driver';
import { MCPProviderDriver } from '../../application/tool-platform/drivers/mcp-provider-driver';
import { ToolExecutionPipeline } from '../../application/tool-platform/pipeline/tool-execution-pipeline';
import { ExecuteToolCommandHandler } from '../../application/tool-platform/commands/execute-tool.command';
import { CircuitBreakerService } from '../../application/tool-platform/services/circuit-breaker-service';

describe('Phase 2 — 10-Stage ToolExecutionPipeline, Provider Drivers, Deadline & Resilience', () => {
  const repository = new InMemoryToolRegistryRepositoryAdapter();
  const registerDefHandler = new RegisterToolDefinitionCommandHandler(
    repository,
  );
  const resolver = new ToolResolver(repository);

  const providerSelector = new ProviderSelectorService();
  const httpDriver = new HTTPProviderDriver();
  const mcpDriver = new MCPProviderDriver();
  providerSelector.registerDriver(httpDriver);
  providerSelector.registerDriver(mcpDriver);

  const circuitBreaker = new CircuitBreakerService(3, 10000);
  const pipeline = ToolExecutionPipeline.createDefault(
    providerSelector,
    circuitBreaker,
  );
  const executeHandler = new ExecuteToolCommandHandler(resolver, pipeline);

  const tenant = TenantContext.create({
    tenantId: 'tenant-tool-p2',
    organizationId: 'org-p2',
    workspaceId: 'ws-p2',
    environment: 'test',
    region: 'us-east-1',
  });

  it('executes tool through 10-stage pipeline, returning normalized result and driver metadata', async () => {
    // 1. Register Tool Definition for HTTP Provider
    await registerDefHandler.execute({
      toolId: 'tool-http-calc',
      name: 'Calculator Tool',
      description: 'Performs basic arithmetic',
      category: 'API',
      provider: 'http-provider',
      version: '1.0.0',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      tenantContext: tenant,
    });

    // 2. Execute Tool Command
    const result = await executeHandler.execute({
      toolId: 'tool-http-calc',
      payload: { a: 10, b: 20, op: 'add' },
      tenantContext: tenant,
    });

    expect(result.status).toBe('SUCCESS');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.output['httpResponse']).toContain('HTTP 200 OK');
    expect(result.normalizedOutput?.['__normalizedAt']).toBeDefined();

    // 3. Register Tool Definition for MCP Provider & Verify Dynamic Capability Snapshot
    await registerDefHandler.execute({
      toolId: 'tool-mcp-file',
      name: 'MCP File System Tool',
      description: 'Interacts with local filesystem',
      category: 'MCP',
      provider: 'mcp-provider',
      version: '1.0.0',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      tenantContext: tenant,
    });

    const mcpCaps = await mcpDriver.getCapabilities();
    expect(mcpCaps.supportsStreaming).toBe(true);
    expect(mcpCaps.supportsFiles).toBe(true);

    const mcpResult = await executeHandler.execute({
      toolId: 'tool-mcp-file',
      payload: { action: 'readFile', path: '/tmp/test.txt' },
      tenantContext: tenant,
    });

    expect(mcpResult.status).toBe('SUCCESS');
    expect(mcpResult.output['result']).toContain('MCP tool execution output');
  });
});

import { describe, it, expect } from 'vitest';
import { CompositionRoot } from './composition-root';
import { TenantContext } from '../application/identity/tenant-context';
import {
  ToolInvocation,
  type InvocationId,
} from '../application/agent/vo/tool-invocation';
import { ToolArguments } from '../application/agent/vo/tool-arguments';
import {
  ToolDefinition,
  type ToolId,
} from '../application/agent/vo/tool-definition';
import { ToolSchema } from '../application/agent/vo/tool-schema';
import { ToolResult } from '../application/agent/vo/tool-result';
import type { ToolRegistryPort } from '../application/agent/ports/tool-registry-port';
import type { ToolDispatcherPort } from '../application/agent/ports/tool-dispatcher-port';
import type { ToolExecutionPort } from '../application/agent/ports/tool-execution-port';
import type { CorrelationId } from '../shared/types';

describe('Composition Root & Tool Runtime Smoke Test', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-smoke-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const toolId = 'smoke-echo-tool' as ToolId;
  const invocationId = 'inv-smoke-1' as InvocationId;
  const correlationId = 'corr-smoke-1' as CorrelationId;

  it('builds complete composition root, resolves registry, registers tool, dispatches and executes fake tool', async () => {
    const composition = new CompositionRoot();
    const registryContainer = await composition.assemble();

    // 1. Resolve ToolRegistryPort and ToolDispatcherPort from IoC container
    const toolRegistry =
      registryContainer.resolve<ToolRegistryPort>('ToolRegistryPort');
    const toolDispatcher =
      registryContainer.resolve<ToolDispatcherPort>('ToolDispatcherPort');

    expect(toolRegistry).toBeDefined();
    expect(toolDispatcher).toBeDefined();

    // 2. Define and register a fake tool adapter
    const smokeDefinition = ToolDefinition.create({
      toolId,
      displayName: 'Smoke Echo Tool',
      description: 'Echoes test string for Composition Root validation',
      version: '1.0.0',
      inputSchema: ToolSchema.empty(),
    });

    const fakeToolAdapter: ToolExecutionPort = {
      toolId,
      definition: smokeDefinition,
      async execute(_tenant, invocation) {
        return ToolResult.create({
          invocationId: invocation.invocationId,
          toolId: invocation.toolId,
          status: 'success',
          output: `Echo: ${invocation.arguments.toJson()}`,
          executionTimeMs: 2,
        });
      },
    };

    toolRegistry.registerAdapter(toolId, fakeToolAdapter);

    // 3. Dispatch tool invocation through IoC-resolved ToolDispatcherPort
    const invocation = ToolInvocation.create({
      invocationId,
      toolId,
      arguments: ToolArguments.create({ rawJson: { testKey: 'smokeValue' } }),
      correlationId,
    });

    const result = await toolDispatcher.dispatch(tenant, invocation);

    // 4. Verify successful execution
    expect(result.status).toBe('success');
    expect(result.output).toBe('Echo: {"testKey":"smokeValue"}');
  });
});

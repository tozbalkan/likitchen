import { describe, it, expect } from 'vitest';
import { ToolDispatcher } from './tool-dispatcher';
import { TenantContext } from '../../identity/tenant-context';
import { ToolInvocation } from '../vo/tool-invocation';
import { ToolArguments } from '../vo/tool-arguments';
import { ToolResult } from '../vo/tool-result';
import { ToolDefinition } from '../vo/tool-definition';
import { ToolSchema } from '../vo/tool-schema';
import { ToolUnavailableError } from '../errors/tool-execution-error';
import type { ToolRegistryPort } from '../ports/tool-registry-port';
import type { ToolExecutionPort } from '../ports/tool-execution-port';
import type { ToolId } from '../vo/tool-definition';
import type { InvocationId } from '../vo/tool-invocation';
import type { CorrelationId } from '../../../shared/types';

describe('ToolDispatcher Application Service', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-dispatcher-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const toolId = 'tool-calc' as ToolId;
  const invocationId = 'inv-calc-1' as InvocationId;
  const correlationId = 'corr-1' as CorrelationId;

  const mockDefinition = ToolDefinition.create({
    toolId,
    displayName: 'Calc',
    description: 'Calculator',
    version: '1.0.0',
    inputSchema: ToolSchema.empty(),
  });

  const mockAdapter: ToolExecutionPort = {
    toolId,
    definition: mockDefinition,
    async execute(_tenant, invocation) {
      return ToolResult.create({
        invocationId: invocation.invocationId,
        toolId: invocation.toolId,
        status: 'success',
        output: '42',
        executionTimeMs: 5,
      });
    },
  };

  class MockRegistry implements ToolRegistryPort {
    private readonly adapters = new Map<string, ToolExecutionPort>();

    registerAdapter(id: ToolId, adapter: ToolExecutionPort): void {
      this.adapters.set(id, adapter);
    }

    resolveAdapter(id: ToolId): ToolExecutionPort {
      const adapter = this.adapters.get(id);
      if (!adapter) throw new Error('Not found');
      return adapter;
    }

    hasAdapter(id: ToolId): boolean {
      return this.adapters.has(id);
    }

    getDefinitions(): ReadonlyArray<ToolDefinition> {
      return [...this.adapters.values()].map((a) => a.definition);
    }
  }

  it('dispatches invocation to resolved tool adapter via registry', async () => {
    const registry = new MockRegistry();
    registry.registerAdapter(toolId, mockAdapter);

    const dispatcher = new ToolDispatcher(registry);
    const invocation = ToolInvocation.create({
      invocationId,
      toolId,
      arguments: ToolArguments.empty(),
      correlationId,
    });

    const result = await dispatcher.dispatch(tenant, invocation);
    expect(result.isSuccess).toBe(true);
    expect(result.output).toBe('42');
  });

  it('throws ToolUnavailableError when tool is not registered', async () => {
    const registry = new MockRegistry();
    const dispatcher = new ToolDispatcher(registry);
    const invocation = ToolInvocation.create({
      invocationId,
      toolId,
      arguments: ToolArguments.empty(),
      correlationId,
    });

    await expect(dispatcher.dispatch(tenant, invocation)).rejects.toThrow(
      ToolUnavailableError,
    );
  });
});

import { describe, it, expect } from 'vitest';
import { InMemoryToolRegistryAdapter } from './in-memory-tool-registry-adapter';
import { InMemoryToolExecutionAdapter } from './in-memory-tool-execution-adapter';
import { ToolDispatcher } from '../../application/agent/services/tool-dispatcher';
import { TenantContext } from '../../application/identity/tenant-context';
import {
  ToolDefinition,
  type ToolId,
} from '../../application/agent/vo/tool-definition';
import { ToolSchema } from '../../application/agent/vo/tool-schema';
import {
  ToolInvocation,
  type InvocationId,
} from '../../application/agent/vo/tool-invocation';
import { ToolArguments } from '../../application/agent/vo/tool-arguments';
import { ToolResult } from '../../application/agent/vo/tool-result';
import {
  ToolExecutionError,
  ToolUnavailableError,
} from '../../application/agent/errors/tool-execution-error';
import type { CorrelationId } from '../../shared/types';

describe('Tool Execution Suite (Contract & Infrastructure Tests)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-contract-tool',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const toolIdA = 'tool-weather' as ToolId;
  const toolIdB = 'tool-calculator' as ToolId;
  const correlationId = 'corr-contract-1' as CorrelationId;

  const defA = ToolDefinition.create({
    toolId: toolIdA,
    displayName: 'Weather Tool',
    description: 'Fetches weather info',
    version: '1.0.0',
    inputSchema: ToolSchema.empty(),
  });

  const defB = ToolDefinition.create({
    toolId: toolIdB,
    displayName: 'Calculator Tool',
    description: 'Evaluates expressions',
    version: '1.0.0',
    inputSchema: ToolSchema.empty(),
  });

  describe('InMemoryToolRegistryAdapter', () => {
    it('1. Rejects duplicate tool registrations explicitly', () => {
      const registry = new InMemoryToolRegistryAdapter();
      const adapterA = new InMemoryToolExecutionAdapter({ definition: defA });

      registry.registerAdapter(toolIdA, adapterA);

      expect(() => registry.registerAdapter(toolIdA, adapterA)).toThrow(
        /Duplicate tool registration detected/,
      );
    });

    it('2. Maintains lookup independence regardless of insertion order', () => {
      const registry = new InMemoryToolRegistryAdapter();
      const adapterA = new InMemoryToolExecutionAdapter({ definition: defA });
      const adapterB = new InMemoryToolExecutionAdapter({ definition: defB });

      registry.registerAdapter(toolIdB, adapterB);
      registry.registerAdapter(toolIdA, adapterA);

      expect(registry.resolveAdapter(toolIdA).definition.displayName).toBe(
        'Weather Tool',
      );
      expect(registry.resolveAdapter(toolIdB).definition.displayName).toBe(
        'Calculator Tool',
      );
    });

    it('3. Supports safe concurrent resolution', async () => {
      const registry = new InMemoryToolRegistryAdapter();
      const adapterA = new InMemoryToolExecutionAdapter({ definition: defA });
      registry.registerAdapter(toolIdA, adapterA);

      const resolutions = await Promise.all(
        Array.from({ length: 10 }).map(async () =>
          registry.resolveAdapter(toolIdA),
        ),
      );

      expect(resolutions.length).toBe(10);
      resolutions.forEach((res) => expect(res.toolId).toBe(toolIdA));
    });
  });

  describe('InMemoryToolExecutionAdapter Exception Mapping', () => {
    it('4. Maps unexpected raw adapter exceptions into ToolExecutionError', async () => {
      const faultyAdapter = new InMemoryToolExecutionAdapter({
        definition: defA,
        handler: () => {
          throw new TypeError('Unexpected network socket error');
        },
      });

      const invocation = ToolInvocation.create({
        invocationId: 'inv-err-1' as InvocationId,
        toolId: toolIdA,
        arguments: ToolArguments.empty(),
        correlationId,
      });

      await expect(faultyAdapter.execute(tenant, invocation)).rejects.toThrow(
        ToolExecutionError,
      );
    });
  });

  describe('ToolDispatcher Integration', () => {
    it('5. Transparently forwards execution outcomes without modification', async () => {
      const registry = new InMemoryToolRegistryAdapter();
      const adapterA = new InMemoryToolExecutionAdapter({
        definition: defA,
        cannedOutput: 'Weather: Sunny 25C',
      });
      registry.registerAdapter(toolIdA, adapterA);

      const dispatcher = new ToolDispatcher(registry);
      const invocation = ToolInvocation.create({
        invocationId: 'inv-disp-1' as InvocationId,
        toolId: toolIdA,
        arguments: ToolArguments.empty(),
        correlationId,
      });

      const result = await dispatcher.dispatch(tenant, invocation);
      expect(result.status).toBe('success');
      expect(result.output).toContain('Weather: Sunny 25C');
    });

    it('6. Handles concurrent invocation execution cleanly', async () => {
      const registry = new InMemoryToolRegistryAdapter();
      const adapterA = new InMemoryToolExecutionAdapter({ definition: defA });
      registry.registerAdapter(toolIdA, adapterA);

      const dispatcher = new ToolDispatcher(registry);

      const invocations = Array.from({ length: 5 }).map((_, i) =>
        ToolInvocation.create({
          invocationId: `inv-concurrent-${i}` as InvocationId,
          toolId: toolIdA,
          arguments: ToolArguments.empty(),
          correlationId,
        }),
      );

      const results = await Promise.all(
        invocations.map((inv) => dispatcher.dispatch(tenant, inv)),
      );

      expect(results.length).toBe(5);
      results.forEach((res, i) => {
        expect(res.invocationId).toBe(`inv-concurrent-${i}`);
        expect(res.isSuccess).toBe(true);
      });
      expect(adapterA.callCount).toBe(5);
    });

    it('7. Throws ToolUnavailableError for unregistered tools', async () => {
      const registry = new InMemoryToolRegistryAdapter();
      const dispatcher = new ToolDispatcher(registry);

      const invocation = ToolInvocation.create({
        invocationId: 'inv-missing' as InvocationId,
        toolId: 'unregistered-tool' as ToolId,
        arguments: ToolArguments.empty(),
        correlationId,
      });

      await expect(dispatcher.dispatch(tenant, invocation)).rejects.toThrow(
        ToolUnavailableError,
      );
    });
  });
});

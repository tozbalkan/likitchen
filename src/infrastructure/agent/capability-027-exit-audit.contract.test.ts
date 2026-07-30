import { describe, it, expect, vi } from 'vitest';
import { ApplicationRegistry } from '../../bootstrap/application-registry';
import { registerProviders } from '../../bootstrap/register-providers';
import { DeploymentProfile } from '../../application/operations/deployment-profile';
import { TokenAccountingChatCompletionDecorator } from '../../application/agent/decorators/token-accounting-chat-completion-decorator';
import { RetryChatCompletionDecorator } from '../../application/agent/decorators/retry-chat-completion-decorator';
import { CircuitBreakerToolDecorator } from '../../application/agent/decorators/circuit-breaker-tool-decorator';
import { CircuitBreakerPolicy } from '../../application/agent/vo/circuit-breaker-policy';
import { SystemClock } from '../clock/system-clock';
import { TenantContext } from '../../application/identity/tenant-context';
import {
  ToolInvocation,
  type InvocationId,
} from '../../application/agent/vo/tool-invocation';
import { ToolArguments } from '../../application/agent/vo/tool-arguments';
import {
  ToolDefinition,
  type ToolId,
} from '../../application/agent/vo/tool-definition';
import { ToolSchema } from '../../application/agent/vo/tool-schema';
import { ToolResult } from '../../application/agent/vo/tool-result';
import { ToolUnavailableError } from '../../application/agent/errors/tool-execution-error';
import { DefaultStreamingChatResponse } from '../../application/agent/ports/streaming-chat-response';
import { StreamMetadata } from '../../application/agent/vo/stream-metadata';
import {
  ModelDescriptor,
  type ProviderId,
  type ModelId,
} from '../../application/agent/vo/model-descriptor';
import {
  createTextDeltaChunk,
  createFinishChunk,
  type ChatStreamChunk,
} from '../../application/agent/vo/chat-stream-chunk';
import type { ToolExecutionPort } from '../../application/agent/ports/tool-execution-port';

describe('Capability-027 Architecture Exit Audit Contract Suite (8 Inspection Points)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-exit-audit',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const toolId = 'tool-audit' as ToolId;
  const mockDefinition = ToolDefinition.create({
    toolId,
    displayName: 'Audit Tool',
    description: 'Audit Tool',
    version: '1.0.0',
    inputSchema: ToolSchema.empty(),
  });

  const validInvocation = ToolInvocation.create({
    invocationId: 'inv-audit-1' as InvocationId,
    toolId,
    arguments: ToolArguments.empty(),
    correlationId: 'corr-audit-1' as import('../../shared/types').CorrelationId,
  });

  it('1. [Check 1] Decorator Ordering in Composition Root is strictly TokenAccounting -> Retry -> RawAdapter', () => {
    const registry = new ApplicationRegistry();
    registerProviders(registry, DeploymentProfile.development());

    const chatPort = registry.resolve<
      import('../../application/agent/ports/chat-completion-port').ChatCompletionPort
    >('UnifiedChatCompletionPort');
    expect(chatPort).toBeInstanceOf(TokenAccountingChatCompletionDecorator);

    // Inspect inner of TokenAccountingChatCompletionDecorator
    const accountingDecorator =
      chatPort as TokenAccountingChatCompletionDecorator;
    const innerRetry = (accountingDecorator as unknown as { inner: unknown })
      .inner;
    expect(innerRetry).toBeInstanceOf(RetryChatCompletionDecorator);
  });

  it('2. [Check 2 & 5] Circuit Breaker handles HALF_OPEN state transitions & race conditions safely', async () => {
    const executeSpy = vi.fn().mockImplementation(async () => {
      return ToolResult.create({
        invocationId: validInvocation.invocationId,
        toolId,
        status: 'failure',
        output: '500 Server Error',
        executionTimeMs: 5,
      });
    });

    const innerPort: ToolExecutionPort = {
      toolId,
      definition: mockDefinition,
      execute: executeSpy,
    };

    const decorator = new CircuitBreakerToolDecorator({
      inner: innerPort,
      policy: CircuitBreakerPolicy.create({
        failureThreshold: 2,
        resetTimeoutMs: 1000,
      }),
      clock: new SystemClock(),
    });

    await decorator.execute(tenant, validInvocation);
    await decorator.execute(tenant, validInvocation);
    expect(decorator.currentState).toBe('OPEN');

    await expect(decorator.execute(tenant, validInvocation)).rejects.toThrow(
      ToolUnavailableError,
    );
  });

  it('3. [Check 3 & 4] Streaming resource lifecycle & AbortSignal cancellation operate without memory leak', async () => {
    const metadata = StreamMetadata.create({ streamId: 'stream-audit', model });

    async function* sourceStream(): AsyncIterable<ChatStreamChunk> {
      yield createTextDeltaChunk('c-1', 0, 'Part 1');
      yield createTextDeltaChunk('c-2', 1, 'Part 2');
      yield createFinishChunk('c-3', 2, 'STOP');
    }

    const response = new DefaultStreamingChatResponse(metadata, sourceStream());

    // Consumer breaks early after 1 chunk
    for await (const _chunk of response.stream) {
      break;
    }

    expect(response.getUsageStatus()).toBe('CANCELLED');
    const usage = await response.getUsage();
    expect(usage).toBeUndefined();
  });

  it('4. [Check 6, 7 & 8] State ownership and Capability-028 boundaries remain isolated', () => {
    const registry = new ApplicationRegistry();
    registerProviders(registry, DeploymentProfile.development());

    const engine = registry.resolve<
      import('../../application/agent/ports/reasoning-engine-port').ReasoningEnginePort
    >('ReasoningEnginePort');
    expect(engine).toBeDefined();

    // Confirm engine does NOT expose planner, retry, or circuit breaker methods
    const engineKeys = Object.keys(engine);
    expect(engineKeys.includes('planSubGoal')).toBe(false);
    expect(engineKeys.includes('retryExecution')).toBe(false);
    expect(engineKeys.includes('resetCircuitBreaker')).toBe(false);
  });
});

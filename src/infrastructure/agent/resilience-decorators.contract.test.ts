import { describe, it, expect, vi } from 'vitest';
import { RetryChatCompletionDecorator } from '../../application/agent/decorators/retry-chat-completion-decorator';
import { CircuitBreakerToolDecorator } from '../../application/agent/decorators/circuit-breaker-tool-decorator';
import { RetryPolicy } from '../../application/agent/vo/retry-policy';
import { ConstantBackoff } from '../../application/agent/vo/backoff-policy';
import { CircuitBreakerPolicy } from '../../application/agent/vo/circuit-breaker-policy';
import { TransientErrorRetryDecisionPolicy } from '../../application/agent/vo/retry-decision-policy';
import { TenantContext } from '../../application/identity/tenant-context';
import {
  ModelDescriptor,
  type ProviderId,
  type ModelId,
} from '../../application/agent/vo/model-descriptor';
import { LLMRequest } from '../../application/agent/vo/llm-request';
import { LLMResponse } from '../../application/agent/vo/llm-response';
import { LLMChoice } from '../../application/agent/vo/llm-choice';
import { LLMMessage } from '../../application/agent/vo/llm-message';
import { UsageBreakdown } from '../../application/agent/vo/usage-breakdown';
import {
  ToolInvocation,
  type InvocationId,
} from '../../application/agent/vo/tool-invocation';
import { ToolArguments } from '../../application/agent/vo/tool-arguments';
import { ToolResult } from '../../application/agent/vo/tool-result';
import {
  ToolDefinition,
  type ToolId,
} from '../../application/agent/vo/tool-definition';
import { ToolSchema } from '../../application/agent/vo/tool-schema';
import {
  ToolUnavailableError,
  ToolValidationError,
} from '../../application/agent/errors/tool-execution-error';
import { SystemClock } from '../clock/system-clock';
import type { ChatCompletionPort } from '../../application/agent/ports/chat-completion-port';
import type { ToolExecutionPort } from '../../application/agent/ports/tool-execution-port';
import type { DelayPort } from '../../application/ports/clock/delay-port';
import type { CorrelationId } from '../../shared/types';

class ImmediateDelay implements DelayPort {
  sleep(_ms: number): Promise<void> {
    return Promise.resolve();
  }
}

describe('Resilience Decorators Contract Suite (Capability-027 Iteration 4)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-resilience-contract',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const toolId = 'tool-contract' as ToolId;
  const mockDefinition = ToolDefinition.create({
    toolId,
    displayName: 'Contract Tool',
    description: 'Contract Tool',
    version: '1.0.0',
    inputSchema: ToolSchema.empty(),
  });

  const validRequest = LLMRequest.create({
    model,
    messages: [LLMMessage.fromText('user', 'Test prompt')],
  });

  const validInvocation = ToolInvocation.create({
    invocationId: 'inv-contract-100' as InvocationId,
    toolId,
    arguments: ToolArguments.empty(),
    correlationId: 'corr-1' as CorrelationId,
  });

  const mockResponse = LLMResponse.create({
    id: 'resp-contract',
    model,
    choices: [
      LLMChoice.create({
        index: 0,
        message: LLMMessage.fromText('assistant', 'Contract OK'),
        finishReason: 'stop',
      }),
    ],
    usage: UsageBreakdown.zero(),
    createdAt: new Date(),
  });

  it('1. [Contract] RetryChatCompletionDecorator retries transient error (HTTP 503) up to maxAttempts', async () => {
    let attempts = 0;
    const innerPort: ChatCompletionPort = {
      async complete() {
        attempts++;
        if (attempts < 3) {
          throw { status: 503, message: 'Service Unavailable' };
        }
        return mockResponse;
      },
    };

    const decorator = new RetryChatCompletionDecorator({
      inner: innerPort,
      retryPolicy: RetryPolicy.create({
        maxAttempts: 3,
        backoff: new ConstantBackoff(10),
        decisionPolicy: new TransientErrorRetryDecisionPolicy(),
      }),
      delayService: new ImmediateDelay(),
    });

    const response = await decorator.complete(tenant, validRequest);
    expect(response.primaryChoice.message.textContent).toBe('Contract OK');
    expect(attempts).toBe(3);
  });

  it('2. [Contract] RetryChatCompletionDecorator propagates non-retryable error (ToolValidationError) without retrying', async () => {
    let attempts = 0;
    const innerPort: ChatCompletionPort = {
      async complete() {
        attempts++;
        throw new ToolValidationError(toolId, validInvocation.invocationId, [
          'Bad payload',
        ]);
      },
    };

    const decorator = new RetryChatCompletionDecorator({
      inner: innerPort,
      retryPolicy: RetryPolicy.create({
        maxAttempts: 3,
        backoff: new ConstantBackoff(10),
        decisionPolicy: new TransientErrorRetryDecisionPolicy(),
      }),
      delayService: new ImmediateDelay(),
    });

    await expect(decorator.complete(tenant, validRequest)).rejects.toThrow(
      ToolValidationError,
    );
    expect(attempts).toBe(1);
  });

  it('3. [Contract] CircuitBreakerToolDecorator opens after failureThreshold and rejects subsequent calls with ToolUnavailableError', async () => {
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
        failureThreshold: 3,
        resetTimeoutMs: 10000,
      }),
      clock: new SystemClock(),
    });

    // 3 Failures to trip breaker
    await decorator.execute(tenant, validInvocation);
    await decorator.execute(tenant, validInvocation);
    await decorator.execute(tenant, validInvocation);
    expect(decorator.currentState).toBe('OPEN');
    expect(executeSpy).toHaveBeenCalledTimes(3);

    // 4th Call rejected immediately without calling inner execution
    await expect(decorator.execute(tenant, validInvocation)).rejects.toThrow(
      ToolUnavailableError,
    );
    expect(executeSpy).toHaveBeenCalledTimes(3); // Still 3 calls!
  });
});

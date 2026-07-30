import { describe, it, expect } from 'vitest';
import { RetryChatCompletionDecorator } from './retry-chat-completion-decorator';
import { RetryPolicy } from '../vo/retry-policy';
import { ConstantBackoff } from '../vo/backoff-policy';
import { TransientErrorRetryDecisionPolicy } from '../vo/retry-decision-policy';
import type { DelayPort } from '../../ports/clock/delay-port';
import { TenantContext } from '../../identity/tenant-context';
import {
  ModelDescriptor,
  type ProviderId,
  type ModelId,
} from '../vo/model-descriptor';
import { LLMRequest } from '../vo/llm-request';
import { LLMResponse } from '../vo/llm-response';
import { LLMChoice } from '../vo/llm-choice';
import { LLMMessage } from '../vo/llm-message';
import { UsageBreakdown } from '../vo/usage-breakdown';
import { ToolValidationError } from '../errors/tool-execution-error';
import type { ToolId } from '../vo/tool-definition';
import type { InvocationId } from '../vo/tool-invocation';
import type { ChatCompletionPort } from '../ports/chat-completion-port';

class MockDelay implements DelayPort {
  readonly requestedDelays: number[] = [];

  sleep(ms: number): Promise<void> {
    this.requestedDelays.push(ms);
    return Promise.resolve();
  }
}

describe('RetryChatCompletionDecorator Application Decorator', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-retry-test',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const request = LLMRequest.create({
    model,
    messages: [LLMMessage.fromText('user', 'Hello')],
  });

  const mockResponse = LLMResponse.create({
    id: 'resp-success',
    model,
    choices: [
      LLMChoice.create({
        index: 0,
        message: LLMMessage.fromText('assistant', 'Hi'),
        finishReason: 'stop',
      }),
    ],
    usage: UsageBreakdown.zero(),
    createdAt: new Date(),
  });

  it('1. Retries transient error (503) up to maxAttempts and returns successful LLMResponse', async () => {
    let attempts = 0;
    const fakeDelay = new MockDelay();

    const innerPort: ChatCompletionPort = {
      async complete() {
        attempts++;
        if (attempts < 3) {
          throw { status: 503, message: 'Service Unavailable' };
        }
        return mockResponse;
      },
    };

    const policy = RetryPolicy.create({
      maxAttempts: 3,
      backoff: new ConstantBackoff(50),
      decisionPolicy: new TransientErrorRetryDecisionPolicy(),
    });

    const decorator = new RetryChatCompletionDecorator({
      inner: innerPort,
      retryPolicy: policy,
      delayService: fakeDelay,
    });

    const response = await decorator.complete(tenant, request);

    expect(response.primaryChoice.message.textContent).toBe('Hi');
    expect(attempts).toBe(3);
    expect(fakeDelay.requestedDelays).toEqual([50, 50]);
  });

  it('2. Immediately throws non-retryable error (ToolValidationError) on first attempt without retrying', async () => {
    let attempts = 0;
    const fakeDelay = new MockDelay();

    const innerPort: ChatCompletionPort = {
      async complete() {
        attempts++;
        throw new ToolValidationError(
          'tool-1' as ToolId,
          'inv-1' as InvocationId,
          ['Bad args'],
        );
      },
    };

    const policy = RetryPolicy.create({
      maxAttempts: 3,
      backoff: new ConstantBackoff(50),
      decisionPolicy: new TransientErrorRetryDecisionPolicy(),
    });

    const decorator = new RetryChatCompletionDecorator({
      inner: innerPort,
      retryPolicy: policy,
      delayService: fakeDelay,
    });

    await expect(decorator.complete(tenant, request)).rejects.toThrow(
      ToolValidationError,
    );
    expect(attempts).toBe(1);
    expect(fakeDelay.requestedDelays.length).toBe(0);
  });

  it('3. Preserves original error when maxAttempts are exhausted', async () => {
    let attempts = 0;
    const fakeDelay = new MockDelay();

    const innerPort: ChatCompletionPort = {
      async complete() {
        attempts++;
        throw new Error('Persistent 504 Gateway Timeout');
      },
    };

    const policy = RetryPolicy.create({
      maxAttempts: 3,
      backoff: new ConstantBackoff(10),
      decisionPolicy: new TransientErrorRetryDecisionPolicy(),
    });

    const decorator = new RetryChatCompletionDecorator({
      inner: innerPort,
      retryPolicy: policy,
      delayService: fakeDelay,
    });

    await expect(decorator.complete(tenant, request)).rejects.toThrow(
      'Persistent 504 Gateway Timeout',
    );
    expect(attempts).toBe(3);
    expect(fakeDelay.requestedDelays).toEqual([10, 10]);
  });

  it('4. Halts retry process if AbortSignal is cancelled', async () => {
    const controller = new AbortController();
    const fakeDelay = new MockDelay();

    const innerPort: ChatCompletionPort = {
      async complete() {
        controller.abort();
        throw { status: 503, message: 'Server error' };
      },
    };

    const policy = RetryPolicy.create({
      maxAttempts: 3,
      backoff: new ConstantBackoff(10),
      decisionPolicy: new TransientErrorRetryDecisionPolicy(),
    });

    const decorator = new RetryChatCompletionDecorator({
      inner: innerPort,
      retryPolicy: policy,
      delayService: fakeDelay,
    });

    await expect(
      decorator.complete(tenant, request, { signal: controller.signal }),
    ).rejects.toBeDefined();
  });
});

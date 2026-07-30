import { describe, it, expect } from 'vitest';
import { TokenAccountingChatCompletionDecorator } from '../../application/agent/decorators/token-accounting-chat-completion-decorator';
import { TokenAccountingStreamingDecorator } from '../../application/agent/decorators/token-accounting-streaming-decorator';
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
  createTextDeltaChunk,
  createFinishChunk,
  type ChatStreamChunk,
} from '../../application/agent/vo/chat-stream-chunk';
import type { ChatCompletionPort } from '../../application/agent/ports/chat-completion-port';
import { StreamingChatCompletionPort } from '../../application/agent/ports/streaming-chat-completion-port';

describe('Token Accounting Contract Suite (Capability-027 Iteration 5B)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-accounting-contract',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const sampleUsage = UsageBreakdown.create({
    promptTokens: 12,
    completionTokens: 18,
    totalTokens: 30,
  });

  it('1. [Contract] Unary token accounting returns normalized UsageBreakdown', async () => {
    const innerPort: ChatCompletionPort = {
      async complete() {
        return LLMResponse.create({
          id: 'resp-contract-1',
          model,
          choices: [
            LLMChoice.create({
              index: 0,
              message: LLMMessage.fromText('assistant', 'Contract OK'),
              finishReason: 'stop',
            }),
          ],
          usage: sampleUsage,
          createdAt: new Date(),
        });
      },
    };

    const decorator = new TokenAccountingChatCompletionDecorator({
      inner: innerPort,
    });
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Test')],
    });

    const response = await decorator.complete(tenant, request);
    expect(response.usage.totalTokens).toBe(30);
  });

  it('2. [Contract] Streaming token accounting resolves getUsage() upon stream completion (AVAILABLE)', async () => {
    class MockStreamPort extends StreamingChatCompletionPort {
      async *completeStream(): AsyncIterable<ChatStreamChunk> {
        yield createTextDeltaChunk('c-1', 0, 'Hi');
        yield createFinishChunk('c-2', 1, 'STOP', sampleUsage);
      }
    }

    const decorator = new TokenAccountingStreamingDecorator({
      inner: new MockStreamPort(),
    });
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Test')],
    });

    const tracked = decorator.createTrackedResponse(tenant, request);
    for await (const _chunk of tracked.stream) {
      // consume
    }

    expect(tracked.getUsageStatus()).toBe('AVAILABLE');
    const usage = await tracked.getUsage();
    expect(usage?.totalTokens).toBe(30);
  });

  it('3. [Contract] Stream completion without usage resolves getUsage() to undefined (UNAVAILABLE)', async () => {
    class MockStreamPort extends StreamingChatCompletionPort {
      async *completeStream(): AsyncIterable<ChatStreamChunk> {
        yield createTextDeltaChunk('c-1', 0, 'Hi');
        yield createFinishChunk('c-2', 1, 'STOP');
      }
    }

    const decorator = new TokenAccountingStreamingDecorator({
      inner: new MockStreamPort(),
    });
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Test')],
    });

    const tracked = decorator.createTrackedResponse(tenant, request);
    for await (const _chunk of tracked.stream) {
      // consume
    }

    expect(tracked.getUsageStatus()).toBe('UNAVAILABLE');
    const usage = await tracked.getUsage();
    expect(usage).toBeUndefined();
  });

  it('4. [Contract] Early consumer break transitions lifecycle to CANCELLED and resolves getUsage() to undefined', async () => {
    class MockStreamPort extends StreamingChatCompletionPort {
      async *completeStream(): AsyncIterable<ChatStreamChunk> {
        yield createTextDeltaChunk('c-1', 0, 'Hi');
        yield createTextDeltaChunk('c-2', 1, 'There');
        yield createFinishChunk('c-3', 2, 'STOP', sampleUsage);
      }
    }

    const decorator = new TokenAccountingStreamingDecorator({
      inner: new MockStreamPort(),
    });
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Test')],
    });

    const tracked = decorator.createTrackedResponse(tenant, request);
    for await (const _chunk of tracked.stream) {
      break; // Consumer breaks early!
    }

    expect(tracked.getUsageStatus()).toBe('CANCELLED');
    const usage = await tracked.getUsage();
    expect(usage).toBeUndefined();
  });

  it('5. [Contract] Stream exception transitions lifecycle to FAILED and rejects getUsage() with stream error (FAILED != UNAVAILABLE)', async () => {
    class FailingStreamPort extends StreamingChatCompletionPort {
      async *completeStream(): AsyncIterable<ChatStreamChunk> {
        yield createTextDeltaChunk('c-1', 0, 'Hi');
        throw new Error('Connection Reset By Peer');
      }
    }

    const decorator = new TokenAccountingStreamingDecorator({
      inner: new FailingStreamPort(),
    });
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Test')],
    });

    const tracked = decorator.createTrackedResponse(tenant, request);
    const consume = async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of tracked.stream) {
        // consume
      }
    };

    await expect(consume()).rejects.toThrow('Connection Reset By Peer');
    expect(tracked.getUsageStatus()).toBe('FAILED');
    await expect(tracked.getUsage()).rejects.toThrow(
      'Connection Reset By Peer',
    );
  });
});

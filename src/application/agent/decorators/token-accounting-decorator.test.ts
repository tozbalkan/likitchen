import { describe, it, expect } from 'vitest';
import { TokenAccountingChatCompletionDecorator } from './token-accounting-chat-completion-decorator';
import { TokenAccountingStreamingDecorator } from './token-accounting-streaming-decorator';
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
import {
  createTextDeltaChunk,
  createFinishChunk,
  type ChatStreamChunk,
} from '../vo/chat-stream-chunk';
import type { ChatCompletionPort } from '../ports/chat-completion-port';
import { StreamingChatCompletionPort } from '../ports/streaming-chat-completion-port';

describe('Token Accounting Dedicated Decorators (Capability-027 Iteration 5B)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-accounting-decorator',
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
    promptTokens: 15,
    completionTokens: 25,
    totalTokens: 40,
  });

  it('1. TokenAccountingChatCompletionDecorator passes unary complete call with 0 side-effects', async () => {
    const mockResponse = LLMResponse.create({
      id: 'resp-unary-1',
      model,
      choices: [
        LLMChoice.create({
          index: 0,
          message: LLMMessage.fromText('assistant', 'OK'),
          finishReason: 'stop',
        }),
      ],
      usage: sampleUsage,
      createdAt: new Date(),
    });

    const innerPort: ChatCompletionPort = {
      async complete() {
        return mockResponse;
      },
    };

    const decorator = new TokenAccountingChatCompletionDecorator({
      inner: innerPort,
    });
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Hi')],
    });

    const result = await decorator.complete(tenant, request);
    expect(result.usage.totalTokens).toBe(40);
  });

  it('2. TokenAccountingStreamingDecorator creates tracked StreamingChatResponse', async () => {
    class InnerStreamingPort extends StreamingChatCompletionPort {
      async *completeStream(): AsyncIterable<ChatStreamChunk> {
        yield createTextDeltaChunk('c-1', 0, 'Hello');
        yield createFinishChunk('c-2', 1, 'STOP', sampleUsage);
      }
    }

    const streamingDecorator = new TokenAccountingStreamingDecorator({
      inner: new InnerStreamingPort(),
    });
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Stream test')],
    });

    const trackedResponse = streamingDecorator.createTrackedResponse(
      tenant,
      request,
    );

    const chunks: ChatStreamChunk[] = [];
    for await (const chunk of trackedResponse.stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(2);
    expect(trackedResponse.getUsageStatus()).toBe('AVAILABLE');
    const usage = await trackedResponse.getUsage();
    expect(usage?.totalTokens).toBe(40);
  });
});

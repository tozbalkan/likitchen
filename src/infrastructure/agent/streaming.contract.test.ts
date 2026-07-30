import { describe, it, expect } from 'vitest';
import { OpenAiStreamingChatAdapter } from './openai-streaming-chat-adapter';
import { TenantContext } from '../../application/identity/tenant-context';
import {
  ModelDescriptor,
  type ProviderId,
  type ModelId,
} from '../../application/agent/vo/model-descriptor';
import { LLMRequest } from '../../application/agent/vo/llm-request';
import { LLMMessage } from '../../application/agent/vo/llm-message';
import { ToolValidationError } from '../../application/agent/errors/tool-execution-error';
import type { ChatStreamChunk } from '../../application/agent/vo/chat-stream-chunk';

describe('Response Streaming Contract Suite (Capability-027 Iteration 5A)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-stream-contract',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  it('1. [Contract] Consumes complete text stream and terminates with normalized FinishChunk', async () => {
    const adapter = new OpenAiStreamingChatAdapter();
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Hello world')],
    });

    const chunks: ChatStreamChunk[] = [];
    for await (const chunk of adapter.completeStream(tenant, request)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBeGreaterThan(0);
    const lastChunk = chunks[chunks.length - 1];
    expect(lastChunk?.type).toBe('finish');
    if (lastChunk?.type === 'finish') {
      expect(lastChunk.finishReason).toBe('STOP');
    }
  });

  it('2. [Contract] AbortSignal interrupts active stream iteration immediately', async () => {
    const adapter = new OpenAiStreamingChatAdapter();
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Hello')],
    });

    const controller = new AbortController();
    controller.abort();

    const chunks: ChatStreamChunk[] = [];
    for await (const chunk of adapter.completeStream(tenant, request, {
      signal: controller.signal,
    })) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(0);
  });

  it('3. [Contract] Invalid tenant throws normalized ToolValidationError before streaming starts', async () => {
    const adapter = new OpenAiStreamingChatAdapter();
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Hello')],
    });

    const consume = async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of adapter.completeStream(
        null as unknown as TenantContext,
        request,
      )) {
        // noop
      }
    };

    await expect(consume()).rejects.toThrow(ToolValidationError);
  });
});

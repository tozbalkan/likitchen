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

describe('OpenAiStreamingChatAdapter Infrastructure Adapter', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-stream-test',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  it('1. Streams text delta chunks with monotonic chunk indexing (0, 1, 2...) and terminal FinishChunk', async () => {
    const adapter = new OpenAiStreamingChatAdapter();
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Hi there')],
    });

    const chunks: ChatStreamChunk[] = [];
    for await (const chunk of adapter.completeStream(tenant, request)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(3);
    expect(chunks[0]?.type).toBe('text_delta');
    expect(chunks[0]?.index).toBe(0);
    expect(chunks[1]?.type).toBe('text_delta');
    expect(chunks[1]?.index).toBe(1);
    expect(chunks[2]?.type).toBe('finish');
    expect(chunks[2]?.index).toBe(2);
    if (chunks[2]?.type === 'finish') {
      expect(chunks[2].finishReason).toBe('STOP');
    }
  });

  it('2. Streams incremental ToolCallDeltaChunk deltas', async () => {
    const adapter = new OpenAiStreamingChatAdapter();
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'What is the weather in Tokyo?')],
    });

    const chunks: ChatStreamChunk[] = [];
    for await (const chunk of adapter.completeStream(tenant, request)) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(3);
    expect(chunks[0]?.type).toBe('tool_call_delta');
    if (chunks[0]?.type === 'tool_call_delta') {
      expect(chunks[0].callId).toBe('call-101');
      expect(chunks[0].argumentsDelta).toBe('{"city":');
    }
    expect(chunks[2]?.type).toBe('finish');
    if (chunks[2]?.type === 'finish') {
      expect(chunks[2].finishReason).toBe('TOOL_CALL');
    }
  });

  it('3. Halts stream execution immediately when AbortSignal is cancelled', async () => {
    const adapter = new OpenAiStreamingChatAdapter();
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Hi')],
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

  it('4. Validates request and throws ToolValidationError if tenantContext is invalid', async () => {
    const adapter = new OpenAiStreamingChatAdapter();
    const request = LLMRequest.create({
      model,
      messages: [LLMMessage.fromText('user', 'Hi')],
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

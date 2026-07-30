import { describe, it, expect } from 'vitest';
import { DefaultStreamingChatResponse } from './streaming-chat-response';
import { StreamMetadata } from '../vo/stream-metadata';
import {
  ModelDescriptor,
  type ProviderId,
  type ModelId,
} from '../vo/model-descriptor';
import {
  createTextDeltaChunk,
  createFinishChunk,
  type ChatStreamChunk,
} from '../vo/chat-stream-chunk';
import { UsageBreakdown } from '../vo/usage-breakdown';

describe('StreamingChatResponse Transport Abstraction Lifecycle (Capability-027 Iteration 5B)', () => {
  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const metadata = StreamMetadata.create({ streamId: 'stream-test-1', model });
  const sampleUsage = UsageBreakdown.create({
    promptTokens: 10,
    completionTokens: 20,
    totalTokens: 30,
  });

  it('1. Transition to AVAILABLE when stream completes with usage payload', async () => {
    async function* sourceStream(): AsyncIterable<ChatStreamChunk> {
      yield createTextDeltaChunk('c-1', 0, 'Hi');
      yield createFinishChunk('c-2', 1, 'STOP', sampleUsage);
    }

    const response = new DefaultStreamingChatResponse(metadata, sourceStream());
    expect(response.getUsageStatus()).toBe('PENDING');

    const chunks: ChatStreamChunk[] = [];
    for await (const chunk of response.stream) {
      chunks.push(chunk);
    }

    expect(chunks.length).toBe(2);
    expect(response.getUsageStatus()).toBe('AVAILABLE');
    const usage = await response.getUsage();
    expect(usage?.promptTokens).toBe(10);
    expect(usage?.completionTokens).toBe(20);
  });

  it('2. Transition to UNAVAILABLE when stream completes without usage payload', async () => {
    async function* sourceStream(): AsyncIterable<ChatStreamChunk> {
      yield createTextDeltaChunk('c-1', 0, 'Hi');
      yield createFinishChunk('c-2', 1, 'STOP');
    }

    const response = new DefaultStreamingChatResponse(metadata, sourceStream());

    for await (const _chunk of response.stream) {
      // consume
    }

    expect(response.getUsageStatus()).toBe('UNAVAILABLE');
    const usage = await response.getUsage();
    expect(usage).toBeUndefined();
  });

  it('3. Transition to CANCELLED when consumer breaks early out of stream loop', async () => {
    async function* sourceStream(): AsyncIterable<ChatStreamChunk> {
      yield createTextDeltaChunk('c-1', 0, 'Hi');
      yield createTextDeltaChunk('c-2', 1, 'There');
      yield createFinishChunk('c-3', 2, 'STOP', sampleUsage);
    }

    const response = new DefaultStreamingChatResponse(metadata, sourceStream());

    // Consumer breaks after 1st chunk
    for await (const _chunk of response.stream) {
      break;
    }

    expect(response.getUsageStatus()).toBe('CANCELLED');
    const usage = await response.getUsage();
    expect(usage).toBeUndefined();
  });

  it('4. Transition to FAILED and reject getUsage() when stream throws exception', async () => {
    async function* sourceStream(): AsyncIterable<ChatStreamChunk> {
      yield createTextDeltaChunk('c-1', 0, 'Hi');
      throw new Error('Network Stream Interrupted');
    }

    const response = new DefaultStreamingChatResponse(metadata, sourceStream());

    const consume = async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _chunk of response.stream) {
        // consume
      }
    };

    await expect(consume()).rejects.toThrow('Network Stream Interrupted');
    expect(response.getUsageStatus()).toBe('FAILED');
    await expect(response.getUsage()).rejects.toThrow(
      'Network Stream Interrupted',
    );
  });
});

import { describe, it, expect } from 'vitest';
import {
  createTextDeltaChunk,
  createToolCallDeltaChunk,
  createFinishChunk,
} from './chat-stream-chunk';
import { StreamMetadata } from './stream-metadata';
import {
  ModelDescriptor,
  type ProviderId,
  type ModelId,
} from './model-descriptor';
import type { ToolId } from './tool-definition';

describe('Capability-027 Iteration 5A Step 1 — ChatStreamChunk & StreamMetadata', () => {
  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  it('creates immutable TextDeltaChunk, ToolCallDeltaChunk, and FinishChunk VOs', () => {
    const textChunk = createTextDeltaChunk('chunk-1', 0, 'Hello world');
    expect(textChunk.type).toBe('text_delta');
    expect(textChunk.text).toBe('Hello world');
    expect(textChunk.index).toBe(0);
    expect(Object.isFrozen(textChunk)).toBe(true);

    const toolChunk = createToolCallDeltaChunk(
      'chunk-2',
      1,
      'call-100',
      'tool-calc' as ToolId,
      '{"x":5}',
    );
    expect(toolChunk.type).toBe('tool_call_delta');
    expect(toolChunk.callId).toBe('call-100');
    expect(toolChunk.argumentsDelta).toBe('{"x":5}');
    expect(toolChunk.index).toBe(1);
    expect(Object.isFrozen(toolChunk)).toBe(true);

    const finishChunk = createFinishChunk('chunk-3', 2, 'STOP');
    expect(finishChunk.type).toBe('finish');
    expect(finishChunk.finishReason).toBe('STOP');
    expect(finishChunk.index).toBe(2);
    expect(Object.isFrozen(finishChunk)).toBe(true);
  });

  it('creates immutable StreamMetadata VO', () => {
    const metadata = StreamMetadata.create({
      streamId: 'stream-999',
      model,
    });

    expect(metadata.streamId).toBe('stream-999');
    expect(metadata.model.modelId).toBe('gpt-4o');
    expect(Object.isFrozen(metadata)).toBe(true);
  });
});

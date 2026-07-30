import type { Instant } from '../../../shared/types';
import type { ToolId } from './tool-definition';
import type { UsageBreakdown } from './usage-breakdown';

export type StreamFinishReason =
  'STOP' | 'LENGTH' | 'CONTENT_FILTER' | 'TOOL_CALL' | 'ERROR';

export interface TextDeltaChunk {
  readonly type: 'text_delta';
  readonly chunkId: string;
  readonly index: number;
  readonly text: string;
  readonly timestamp: Instant;
}

export interface ToolCallDeltaChunk {
  readonly type: 'tool_call_delta';
  readonly chunkId: string;
  readonly index: number;
  readonly callId: string;
  readonly toolId: ToolId;
  readonly argumentsDelta: string;
  readonly timestamp: Instant;
}

export interface FinishChunk {
  readonly type: 'finish';
  readonly chunkId: string;
  readonly index: number;
  readonly finishReason: StreamFinishReason;
  readonly usage?: UsageBreakdown | undefined;
  readonly timestamp: Instant;
}

export type ChatStreamChunk = TextDeltaChunk | ToolCallDeltaChunk | FinishChunk;

export function createTextDeltaChunk(
  chunkId: string,
  index: number,
  text: string,
  timestamp?: Instant,
): TextDeltaChunk {
  if (!chunkId || chunkId.trim() === '') {
    throw new Error('[ChatStreamChunk] chunkId is required.');
  }
  if (index < 0) {
    throw new Error('[ChatStreamChunk] index cannot be negative.');
  }
  return Object.freeze({
    type: 'text_delta' as const,
    chunkId,
    index,
    text: text ?? '',
    timestamp: timestamp ?? new Date(),
  });
}

export function createToolCallDeltaChunk(
  chunkId: string,
  index: number,
  callId: string,
  toolId: ToolId,
  argumentsDelta: string,
  timestamp?: Instant,
): ToolCallDeltaChunk {
  if (!chunkId || chunkId.trim() === '') {
    throw new Error('[ChatStreamChunk] chunkId is required.');
  }
  if (index < 0) {
    throw new Error('[ChatStreamChunk] index cannot be negative.');
  }
  if (!callId) {
    throw new Error('[ChatStreamChunk] callId is required.');
  }
  if (!toolId) {
    throw new Error('[ChatStreamChunk] toolId is required.');
  }
  return Object.freeze({
    type: 'tool_call_delta' as const,
    chunkId,
    index,
    callId,
    toolId,
    argumentsDelta: argumentsDelta ?? '',
    timestamp: timestamp ?? new Date(),
  });
}

export function createFinishChunk(
  chunkId: string,
  index: number,
  finishReason: StreamFinishReason = 'STOP',
  usage?: UsageBreakdown,
  timestamp?: Instant,
): FinishChunk {
  if (!chunkId || chunkId.trim() === '') {
    throw new Error('[ChatStreamChunk] chunkId is required.');
  }
  if (index < 0) {
    throw new Error('[ChatStreamChunk] index cannot be negative.');
  }
  return Object.freeze({
    type: 'finish' as const,
    chunkId,
    index,
    finishReason,
    usage,
    timestamp: timestamp ?? new Date(),
  });
}

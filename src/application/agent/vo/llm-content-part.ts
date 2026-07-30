import type { ToolId } from './tool-definition';

export interface LLMTextContentPart {
  readonly type: 'text';
  readonly text: string;
}

export interface LLMToolCallContentPart {
  readonly type: 'tool_call';
  readonly callId: string;
  readonly toolId: ToolId;
  readonly arguments: string;
}

export interface LLMToolResultContentPart {
  readonly type: 'tool_result';
  readonly callId: string;
  readonly toolId: ToolId;
  readonly output: string;
  readonly isError: boolean;
}

export type LLMContentPart =
  LLMTextContentPart | LLMToolCallContentPart | LLMToolResultContentPart;

export function createTextPart(text: string): LLMTextContentPart {
  if (!text || text.trim() === '') {
    throw new Error('[LLMTextContentPart] text cannot be empty.');
  }
  return Object.freeze({
    type: 'text' as const,
    text,
  });
}

export function createToolCallPart(
  callId: string,
  toolId: ToolId,
  argsJson: string,
): LLMToolCallContentPart {
  if (!callId) throw new Error('[LLMToolCallContentPart] callId is required.');
  if (!toolId) throw new Error('[LLMToolCallContentPart] toolId is required.');

  return Object.freeze({
    type: 'tool_call' as const,
    callId,
    toolId,
    arguments: argsJson ?? '{}',
  });
}

export function createToolResultPart(
  callId: string,
  toolId: ToolId,
  output: string,
  isError = false,
): LLMToolResultContentPart {
  if (!callId)
    throw new Error('[LLMToolResultContentPart] callId is required.');
  if (!toolId)
    throw new Error('[LLMToolResultContentPart] toolId is required.');

  return Object.freeze({
    type: 'tool_result' as const,
    callId,
    toolId,
    output: output ?? '',
    isError,
  });
}

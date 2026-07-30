import type { ToolInvocation } from './tool-invocation';
import type { LLMResponse } from './llm-response';

export interface ToolInvocationAction {
  readonly type: 'tool_invocation';
  readonly invocation: ToolInvocation;
}

export interface FinishAction {
  readonly type: 'finish';
  readonly finalResponse?: LLMResponse | undefined;
}

export interface ResponseAction {
  readonly type: 'response';
  readonly content: string;
}

export interface ReflectionAction {
  readonly type: 'reflection';
  readonly thought: string;
}

export type ReasoningAction =
  ToolInvocationAction | FinishAction | ResponseAction | ReflectionAction;

export function createToolInvocationAction(
  invocation: Readonly<ToolInvocation>,
): ToolInvocationAction {
  if (!invocation) {
    throw new Error('[ReasoningAction] ToolInvocation is required.');
  }
  return Object.freeze({
    type: 'tool_invocation' as const,
    invocation,
  });
}

export function createFinishAction(
  finalResponse?: Readonly<LLMResponse>,
): FinishAction {
  return Object.freeze({
    type: 'finish' as const,
    finalResponse,
  });
}

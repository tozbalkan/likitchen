import type { LLMResponse } from '../vo/llm-response';
import type { ToolInvocation } from '../vo/tool-invocation';
import type { ToolArguments } from '../vo/tool-arguments';
import type { ToolId } from '../vo/tool-definition';
import type { InvocationId } from '../vo/tool-invocation';
import type { CorrelationId } from '../../../shared/types';
import {
  createToolInvocationAction,
  createFinishAction,
  type ReasoningAction,
} from '../vo/reasoning-action';
import { ToolArguments as ToolArgumentsClass } from '../vo/tool-arguments';
import { ToolInvocation as ToolInvocationClass } from '../vo/tool-invocation';

export class ReasoningOutputParser {
  static parse(
    response: Readonly<LLMResponse>,
    correlationId: CorrelationId,
    stepIndex: number,
  ): ReasoningAction {
    if (!response) {
      return createFinishAction();
    }

    const primaryChoice = response.primaryChoice;
    const message = primaryChoice.message;

    // 1. Check for tool_call content parts in message
    const toolCallPart = message.parts.find((p) => p.type === 'tool_call');
    if (toolCallPart && toolCallPart.type === 'tool_call') {
      let rawJson: Record<string, unknown> = {};
      try {
        rawJson = JSON.parse(toolCallPart.arguments || '{}') as Record<
          string,
          unknown
        >;
      } catch {
        rawJson = { unparsed: toolCallPart.arguments };
      }

      const args = ToolArgumentsClass.create({ rawJson });
      const invocation = ToolInvocationClass.create({
        invocationId:
          `${toolCallPart.callId ?? 'call'}-${stepIndex}` as InvocationId,
        toolId: toolCallPart.toolId as ToolId,
        arguments: args,
        correlationId,
      });

      return createToolInvocationAction(invocation);
    }

    // 2. Otherwise return FinishAction with final LLMResponse
    return createFinishAction(response);
  }
}

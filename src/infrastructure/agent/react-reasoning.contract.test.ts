import { describe, it, expect, vi } from 'vitest';
import { ReActReasoningEngine } from '../../application/agent/services/react-reasoning-engine';
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
import { GenerationConfig } from '../../application/agent/vo/generation-config';
import { UsageBreakdown } from '../../application/agent/vo/usage-breakdown';
import { ToolResult } from '../../application/agent/vo/tool-result';
import { createToolCallPart } from '../../application/agent/vo/llm-content-part';
import { ExecutionBudgetPolicy } from '../../application/policy/platform-policy';
import { SystemClock } from '../clock/system-clock';
import type { ChatCompletionPort } from '../../application/agent/ports/chat-completion-port';
import type { ToolDispatcherPort } from '../../application/agent/ports/tool-dispatcher-port';
import type { ToolId } from '../../application/agent/vo/tool-definition';

describe('ReActReasoningEngine Contract Suite (Capability-027 Iteration 3)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-react-contract',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const toolId = 'tool-calculator' as ToolId;

  const validRequest = LLMRequest.create({
    model,
    messages: [LLMMessage.fromText('user', 'Calculate 2 + 2 twice.')],
    config: GenerationConfig.create({ temperature: 0 }),
  });

  it('1. [Contract] Direct FinishAction never invokes ToolDispatcherPort', async () => {
    const mockChatPort: ChatCompletionPort = {
      async complete() {
        return LLMResponse.create({
          id: 'resp-direct-finish',
          model,
          choices: [
            LLMChoice.create({
              index: 0,
              message: LLMMessage.fromText(
                'assistant',
                'Direct response without tools.',
              ),
              finishReason: 'stop',
            }),
          ],
          usage: UsageBreakdown.zero(),
          createdAt: new Date(),
        });
      },
    };

    const dispatchSpy = vi.fn();
    const mockDispatcher: ToolDispatcherPort = {
      dispatch: dispatchSpy,
    };

    const engine = new ReActReasoningEngine({
      chatPort: mockChatPort,
      dispatcher: mockDispatcher,
      clock: new SystemClock(),
      budgetPolicy: ExecutionBudgetPolicy.default(),
    });

    const result = await engine.executeCycle(tenant, validRequest);

    expect(result.isCompleted).toBe(true);
    expect(result.finishReason).toBe('COMPLETED');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });

  it('2. [Contract] Allows consecutive invocations of the same tool without engine blockage', async () => {
    let callCount = 0;

    const mockChatPort: ChatCompletionPort = {
      async complete() {
        callCount++;
        if (callCount <= 2) {
          const toolCall = createToolCallPart(
            `call-${callCount}`,
            toolId,
            '{"expr":"2+2"}',
          );
          return LLMResponse.create({
            id: `resp-tool-${callCount}`,
            model,
            choices: [
              LLMChoice.create({
                index: 0,
                message: LLMMessage.create({
                  role: 'assistant',
                  parts: [toolCall],
                }),
                finishReason: 'tool_call',
              }),
            ],
            usage: UsageBreakdown.zero(),
            createdAt: new Date(),
          });
        }
        return LLMResponse.create({
          id: 'resp-final',
          model,
          choices: [
            LLMChoice.create({
              index: 0,
              message: LLMMessage.fromText(
                'assistant',
                'Calculation finished: 4 and 4.',
              ),
              finishReason: 'stop',
            }),
          ],
          usage: UsageBreakdown.zero(),
          createdAt: new Date(),
        });
      },
    };

    const mockDispatcher: ToolDispatcherPort = {
      async dispatch(_t, invocation) {
        return ToolResult.create({
          invocationId: invocation.invocationId,
          toolId: invocation.toolId,
          status: 'success',
          output: '4',
          executionTimeMs: 2,
        });
      },
    };

    const engine = new ReActReasoningEngine({
      chatPort: mockChatPort,
      dispatcher: mockDispatcher,
      clock: new SystemClock(),
      budgetPolicy: ExecutionBudgetPolicy.create({
        maxSteps: 5,
        maxDurationMs: 10000,
      }),
    });

    const result = await engine.executeCycle(tenant, validRequest);

    expect(result.finishReason).toBe('COMPLETED');
    expect(result.steps.length).toBe(3);
    expect(callCount).toBe(3);
  });

  it('3. [Contract] Recovers from tool execution failure observation and continues reasoning cycle', async () => {
    let callCount = 0;

    const mockChatPort: ChatCompletionPort = {
      async complete() {
        callCount++;
        if (callCount === 1) {
          const toolCall = createToolCallPart('call-fail', toolId, '{}');
          return LLMResponse.create({
            id: 'resp-fail',
            model,
            choices: [
              LLMChoice.create({
                index: 0,
                message: LLMMessage.create({
                  role: 'assistant',
                  parts: [toolCall],
                }),
                finishReason: 'tool_call',
              }),
            ],
            usage: UsageBreakdown.zero(),
            createdAt: new Date(),
          });
        }
        return LLMResponse.create({
          id: 'resp-recovered',
          model,
          choices: [
            LLMChoice.create({
              index: 0,
              message: LLMMessage.fromText(
                'assistant',
                'Recovered using fallback logic.',
              ),
              finishReason: 'stop',
            }),
          ],
          usage: UsageBreakdown.zero(),
          createdAt: new Date(),
        });
      },
    };

    const mockDispatcher: ToolDispatcherPort = {
      async dispatch(_t, invocation) {
        return ToolResult.create({
          invocationId: invocation.invocationId,
          toolId: invocation.toolId,
          status: 'failure',
          output: 'Division by zero error',
          executionTimeMs: 1,
        });
      },
    };

    const engine = new ReActReasoningEngine({
      chatPort: mockChatPort,
      dispatcher: mockDispatcher,
      clock: new SystemClock(),
      budgetPolicy: ExecutionBudgetPolicy.default(),
    });

    const result = await engine.executeCycle(tenant, validRequest);

    expect(result.finishReason).toBe('COMPLETED');
    expect(result.steps[0]?.observation?.status).toBe('failure');
    expect(result.steps[0]?.observation?.payload.content).toBe(
      'Division by zero error',
    );
  });

  it('4. [Contract] AbortSignal cancellation prevents any subsequent tool dispatching', async () => {
    const mockChatPort: ChatCompletionPort = {
      async complete() {
        throw new Error('Should not complete');
      },
    };

    const dispatchSpy = vi.fn();
    const mockDispatcher: ToolDispatcherPort = {
      dispatch: dispatchSpy,
    };

    const controller = new AbortController();
    controller.abort();

    const engine = new ReActReasoningEngine({
      chatPort: mockChatPort,
      dispatcher: mockDispatcher,
      clock: new SystemClock(),
      budgetPolicy: ExecutionBudgetPolicy.default(),
    });

    const result = await engine.executeCycle(tenant, validRequest, {
      signal: controller.signal,
    });

    expect(result.finishReason).toBe('CANCELLED');
    expect(dispatchSpy).not.toHaveBeenCalled();
  });
});

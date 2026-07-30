import { describe, it, expect } from 'vitest';
import { ReActReasoningEngine } from './react-reasoning-engine';
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
import { GenerationConfig } from '../vo/generation-config';
import { UsageBreakdown } from '../vo/usage-breakdown';
import { ToolDefinition, type ToolId } from '../vo/tool-definition';
import { ToolSchema } from '../vo/tool-schema';
import { ToolResult } from '../vo/tool-result';
import { createToolCallPart } from '../vo/llm-content-part';
import { ExecutionBudgetPolicy } from '../../policy/platform-policy';
import type { ClockPort } from '../../ports/clock/clock-port';
import type { ChatCompletionPort } from '../ports/chat-completion-port';
import type { ToolDispatcherPort } from '../ports/tool-dispatcher-port';

describe('ReActReasoningEngine Application Service', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-react-test',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const toolId = 'tool-weather' as ToolId;
  const mockDefinition = ToolDefinition.create({
    toolId,
    displayName: 'Weather Tool',
    description: 'Weather fetcher',
    version: '1.0.0',
    inputSchema: ToolSchema.empty(),
  });

  const request = LLMRequest.create({
    model,
    messages: [LLMMessage.fromText('user', 'What is the weather in Tokyo?')],
    config: GenerationConfig.create({ temperature: 0.1 }),
  });

  const mockClock: ClockPort = {
    now: () => new Date(),
  };

  it('1. Completes cycle when LLM returns text response (COMPLETED)', async () => {
    const mockChatPort: ChatCompletionPort = {
      async complete() {
        const choice = LLMChoice.create({
          index: 0,
          message: LLMMessage.fromText('assistant', 'Tokyo is sunny and 22C.'),
          finishReason: 'stop',
        });
        return LLMResponse.create({
          id: 'resp-1',
          model,
          choices: [choice],
          usage: UsageBreakdown.zero(),
          createdAt: new Date(),
        });
      },
    };

    const mockDispatcher: ToolDispatcherPort = {
      async dispatch() {
        throw new Error('Should not dispatch');
      },
    };

    const engine = new ReActReasoningEngine({
      chatPort: mockChatPort,
      dispatcher: mockDispatcher,
      clock: mockClock,
      budgetPolicy: ExecutionBudgetPolicy.default(),
    });

    const cycleResult = await engine.executeCycle(tenant, request);

    expect(cycleResult.isCompleted).toBe(true);
    expect(cycleResult.finishReason).toBe('COMPLETED');
    expect(
      cycleResult.finalResponse?.primaryChoice.message.textContent,
    ).toContain('Tokyo is sunny');
  });

  it('2. Executes tool call, records observation, and completes cycle on second prompt', async () => {
    let promptCallCount = 0;

    const mockChatPort: ChatCompletionPort = {
      async complete() {
        promptCallCount++;
        if (promptCallCount === 1) {
          const toolCallPart = createToolCallPart(
            'call-100',
            toolId,
            '{"city":"Tokyo"}',
          );
          const choice = LLMChoice.create({
            index: 0,
            message: LLMMessage.create({
              role: 'assistant',
              parts: [toolCallPart],
            }),
            finishReason: 'tool_call',
          });
          return LLMResponse.create({
            id: 'resp-tool-1',
            model,
            choices: [choice],
            usage: UsageBreakdown.zero(),
            createdAt: new Date(),
          });
        } else {
          const choice = LLMChoice.create({
            index: 0,
            message: LLMMessage.fromText(
              'assistant',
              'Confirmed: Tokyo weather is 22C.',
            ),
            finishReason: 'stop',
          });
          return LLMResponse.create({
            id: 'resp-tool-2',
            model,
            choices: [choice],
            usage: UsageBreakdown.zero(),
            createdAt: new Date(),
          });
        }
      },
    };

    const mockDispatcher: ToolDispatcherPort = {
      async dispatch(_t, invocation) {
        return ToolResult.create({
          invocationId: invocation.invocationId,
          toolId: invocation.toolId,
          status: 'success',
          output: '22C Sunny',
          executionTimeMs: 10,
        });
      },
    };

    const engine = new ReActReasoningEngine({
      chatPort: mockChatPort,
      dispatcher: mockDispatcher,
      clock: mockClock,
      budgetPolicy: ExecutionBudgetPolicy.default(),
    });

    const cycleResult = await engine.executeCycle(tenant, request);

    expect(cycleResult.finishReason).toBe('COMPLETED');
    expect(cycleResult.steps.length).toBe(2);
    expect(cycleResult.steps[0]?.observation?.payload.content).toBe(
      '22C Sunny',
    );
    expect(promptCallCount).toBe(2);
  });

  it('3. Transparently handles tool execution failure observation without halting cycle', async () => {
    let promptCallCount = 0;

    const mockChatPort: ChatCompletionPort = {
      async complete() {
        promptCallCount++;
        if (promptCallCount === 1) {
          const toolCallPart = createToolCallPart('call-fail', toolId, '{}');
          return LLMResponse.create({
            id: 'resp-fail',
            model,
            choices: [
              LLMChoice.create({
                index: 0,
                message: LLMMessage.create({
                  role: 'assistant',
                  parts: [toolCallPart],
                }),
                finishReason: 'tool_call',
              }),
            ],
            usage: UsageBreakdown.zero(),
            createdAt: new Date(),
          });
        } else {
          return LLMResponse.create({
            id: 'resp-fallback',
            model,
            choices: [
              LLMChoice.create({
                index: 0,
                message: LLMMessage.fromText(
                  'assistant',
                  'Weather service unavailable, using cached data.',
                ),
                finishReason: 'stop',
              }),
            ],
            usage: UsageBreakdown.zero(),
            createdAt: new Date(),
          });
        }
      },
    };

    const mockDispatcher: ToolDispatcherPort = {
      async dispatch(_t, invocation) {
        return ToolResult.create({
          invocationId: invocation.invocationId,
          toolId: invocation.toolId,
          status: 'failure',
          output: 'API 503 Unavailable',
          executionTimeMs: 5,
        });
      },
    };

    const engine = new ReActReasoningEngine({
      chatPort: mockChatPort,
      dispatcher: mockDispatcher,
      clock: mockClock,
      budgetPolicy: ExecutionBudgetPolicy.default(),
    });

    const cycleResult = await engine.executeCycle(tenant, request);

    expect(cycleResult.finishReason).toBe('COMPLETED');
    expect(cycleResult.steps[0]?.observation?.status).toBe('failure');
    expect(cycleResult.steps[0]?.observation?.payload.content).toBe(
      'API 503 Unavailable',
    );
  });

  it('4. Enforces max step budget (MAX_STEPS)', async () => {
    const mockChatPort: ChatCompletionPort = {
      async complete() {
        const toolCallPart = createToolCallPart('call-loop', toolId, '{}');
        return LLMResponse.create({
          id: 'resp-loop',
          model,
          choices: [
            LLMChoice.create({
              index: 0,
              message: LLMMessage.create({
                role: 'assistant',
                parts: [toolCallPart],
              }),
              finishReason: 'tool_call',
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
          output: 'Loop result',
          executionTimeMs: 1,
        });
      },
    };

    const budget = ExecutionBudgetPolicy.create({
      maxSteps: 2,
      maxDurationMs: 10000,
    });
    const engine = new ReActReasoningEngine({
      chatPort: mockChatPort,
      dispatcher: mockDispatcher,
      clock: mockClock,
      budgetPolicy: budget,
    });

    const cycleResult = await engine.executeCycle(tenant, request);

    expect(cycleResult.finishReason).toBe('MAX_STEPS');
    expect(cycleResult.steps.length).toBe(2);
  });

  it('5. Handles AbortSignal cancellation (CANCELLED)', async () => {
    const mockChatPort: ChatCompletionPort = {
      async complete() {
        return LLMResponse.create({
          id: 'resp-unused',
          model,
          choices: [
            LLMChoice.create({
              index: 0,
              message: LLMMessage.fromText('assistant', 'X'),
              finishReason: 'stop',
            }),
          ],
          usage: UsageBreakdown.zero(),
          createdAt: new Date(),
        });
      },
    };

    const mockDispatcher: ToolDispatcherPort = {
      async dispatch() {
        throw new Error('Not called');
      },
    };

    const controller = new AbortController();
    controller.abort();

    const engine = new ReActReasoningEngine({
      chatPort: mockChatPort,
      dispatcher: mockDispatcher,
      clock: mockClock,
      budgetPolicy: ExecutionBudgetPolicy.default(),
    });

    const cycleResult = await engine.executeCycle(tenant, request, {
      signal: controller.signal,
    });

    expect(cycleResult.finishReason).toBe('CANCELLED');
    expect(cycleResult.steps.length).toBe(0);
  });
});

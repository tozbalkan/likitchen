import type {
  ReasoningEnginePort,
  ReasoningEngineOptions,
} from '../ports/reasoning-engine-port';
import type { ChatCompletionPort } from '../ports/chat-completion-port';
import type { ToolDispatcherPort } from '../ports/tool-dispatcher-port';
import type { ClockPort } from '../../ports/clock/clock-port';
import type { ExecutionBudgetPolicy } from '../../policy/platform-policy';
import type { TenantContext } from '../../identity/tenant-context';
import type { LLMRequest } from '../vo/llm-request';
import { LLMRequest as LLMRequestClass } from '../vo/llm-request';
import { LLMMessage } from '../vo/llm-message';
import { createToolResultPart } from '../vo/llm-content-part';
import {
  ReActCycleResult,
  type ReasoningFinishReason,
  type ReasoningSessionId,
} from '../vo/react-cycle-result';
import { ReasoningStep } from '../vo/reasoning-step';
import type { ReasoningAction } from '../vo/reasoning-action';
import type { Observation } from '../vo/observation';
import { ReasoningOutputParser } from './reasoning-output-parser';
import { ObservationMapper } from './observation-mapper';
import { ReasoningLoopGuard } from './reasoning-loop-guard';
import {
  ToolValidationError,
  ToolExecutionError,
} from '../errors/tool-execution-error';
import type { CorrelationId } from '../../../shared/types';

export interface ReActReasoningEngineConfig {
  readonly chatPort: Readonly<ChatCompletionPort>;
  readonly dispatcher: Readonly<ToolDispatcherPort>;
  readonly clock: Readonly<ClockPort>;
  readonly budgetPolicy: Readonly<ExecutionBudgetPolicy>;
}

export class ReActReasoningEngine implements ReasoningEnginePort {
  private readonly chatPort: Readonly<ChatCompletionPort>;
  private readonly dispatcher: Readonly<ToolDispatcherPort>;
  private readonly clock: Readonly<ClockPort>;
  private readonly budgetPolicy: Readonly<ExecutionBudgetPolicy>;

  constructor(config: Readonly<ReActReasoningEngineConfig>) {
    if (!config.chatPort)
      throw new Error('[ReActReasoningEngine] ChatCompletionPort is required.');
    if (!config.dispatcher)
      throw new Error('[ReActReasoningEngine] ToolDispatcherPort is required.');
    if (!config.clock)
      throw new Error('[ReActReasoningEngine] ClockPort is required.');
    if (!config.budgetPolicy)
      throw new Error(
        '[ReActReasoningEngine] ExecutionBudgetPolicy is required.',
      );

    this.chatPort = config.chatPort;
    this.dispatcher = config.dispatcher;
    this.clock = config.clock;
    this.budgetPolicy = config.budgetPolicy;
  }

  async executeCycle(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ReasoningEngineOptions>,
  ): Promise<ReActCycleResult> {
    if (!tenantContext || !tenantContext.tenantId) {
      throw new ToolValidationError(
        'REASONING_ENGINE' as import('../vo/tool-definition').ToolId,
        'EXECUTE_CYCLE' as import('../vo/tool-invocation').InvocationId,
        ['TenantContext with valid tenantId is required.'],
      );
    }
    if (!request) {
      throw new ToolValidationError(
        'REASONING_ENGINE' as import('../vo/tool-definition').ToolId,
        'EXECUTE_CYCLE' as import('../vo/tool-invocation').InvocationId,
        ['LLMRequest is required.'],
      );
    }

    const startTimeMs = this.clock.now().getTime();
    const sessionId = `react-session-${Date.now()}` as ReasoningSessionId;
    const correlationId = `corr-${sessionId}` as unknown as CorrelationId;
    const guard = new ReasoningLoopGuard(this.budgetPolicy, this.clock);

    let currentMessages = [...request.messages];
    const steps: Array<ReasoningStep> = [];
    let stepIndex = 0;
    let finishReason: ReasoningFinishReason = 'COMPLETED';
    let finalResponse = undefined;

    try {
      while (true) {
        // 1. Guard check (cancellation, timeout, max steps)
        const guardStatus = guard.evaluate(
          stepIndex,
          startTimeMs,
          options?.signal,
        );
        if (!guardStatus.canContinue) {
          finishReason = guardStatus.finishReason ?? 'MAX_STEPS';
          break;
        }

        // 2. Build current request for LLM
        const currentRequest = LLMRequestClass.create({
          model: request.model,
          systemMessages: request.systemMessages,
          messages: currentMessages,
          config: request.config,
        });

        // 3. Step A: Prompt LLM
        const llmResponse = await this.promptLLM(
          tenantContext,
          currentRequest,
          options?.signal,
        );

        // 4. Step B: Evaluate LLM Output
        const action = this.evaluateOutput(
          llmResponse,
          correlationId,
          stepIndex,
        );

        if (action.type === 'finish') {
          finalResponse = action.finalResponse ?? llmResponse;
          const finishStep = ReasoningStep.create({
            stepIndex,
            state: 'FINISHED',
            action,
            timestamp: this.clock.now(),
          });
          steps.push(finishStep);
          finishReason = 'COMPLETED';
          break;
        }

        if (action.type === 'tool_invocation') {
          // 5. Step C: Execute Tool
          const toolResult = await this.executeTool(
            tenantContext,
            action.invocation,
          );

          // 6. Step D: Observe Result
          const observation = this.observe(toolResult, stepIndex);

          const step = ReasoningStep.create({
            stepIndex,
            state: 'OBSERVING_RESULT',
            action,
            observation,
            timestamp: this.clock.now(),
          });
          steps.push(step);

          // 7. Append observation to message chain for next LLM prompt iteration
          const toolResultPart = createToolResultPart(
            toolResult.invocationId,
            toolResult.toolId,
            toolResult.output,
            toolResult.status === 'failure',
          );
          const toolResultMessage = LLMMessage.create({
            role: 'user',
            parts: [toolResultPart],
          });
          currentMessages = [...currentMessages, toolResultMessage];

          stepIndex++;
        }
      }
    } catch (err: unknown) {
      if (err instanceof ToolExecutionError) {
        finishReason = 'UNHANDLED_ERROR';
      } else {
        finishReason = 'UNHANDLED_ERROR';
      }
    }

    const totalDurationMs = Math.max(
      0,
      this.clock.now().getTime() - startTimeMs,
    );

    return ReActCycleResult.create({
      sessionId,
      finishReason,
      finalResponse,
      steps,
      totalDurationMs,
    });
  }

  private async promptLLM(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    signal?: AbortSignal,
  ) {
    return await this.chatPort.complete(tenantContext, request, { signal });
  }

  private evaluateOutput(
    response: Readonly<import('../vo/llm-response').LLMResponse>,
    correlationId: CorrelationId,
    stepIndex: number,
  ): ReasoningAction {
    return ReasoningOutputParser.parse(response, correlationId, stepIndex);
  }

  private async executeTool(
    tenantContext: Readonly<TenantContext>,
    invocation: Readonly<import('../vo/tool-invocation').ToolInvocation>,
  ) {
    return await this.dispatcher.dispatch(tenantContext, invocation);
  }

  private observe(
    toolResult: Readonly<import('../vo/tool-result').ToolResult>,
    stepIndex: number,
  ): Observation {
    return ObservationMapper.fromToolResult(toolResult, stepIndex);
  }
}

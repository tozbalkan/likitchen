import type {
  ChatCompletionPort,
  ChatCompletionOptions,
} from '../../application/agent/ports/chat-completion-port';
import type { TenantContext } from '../../application/identity/tenant-context';
import type { LLMRequest } from '../../application/agent/vo/llm-request';
import { LLMResponse } from '../../application/agent/vo/llm-response';
import { LLMChoice } from '../../application/agent/vo/llm-choice';
import { LLMMessage } from '../../application/agent/vo/llm-message';
import { UsageBreakdown } from '../../application/agent/vo/usage-breakdown';
import { ProviderError } from '../../application/agent/errors/agent-runtime-error';

export interface InMemoryChatCompletionAdapterConfig {
  readonly defaultResponseText?: string | undefined;
  readonly cannedResponses?: ReadonlyArray<LLMResponse> | undefined;
  readonly shouldThrowError?: boolean | undefined;
  readonly errorToThrow?: ProviderError | undefined;
}

export class InMemoryChatCompletionAdapter implements ChatCompletionPort {
  private readonly defaultResponseText: string;
  private readonly cannedResponses: ReadonlyArray<LLMResponse>;
  private readonly shouldThrowError: boolean;
  private readonly errorToThrow?: ProviderError | undefined;
  private callCountInternal = 0;

  constructor(config?: Readonly<InMemoryChatCompletionAdapterConfig>) {
    this.defaultResponseText =
      config?.defaultResponseText ?? 'InMemory LLM mock response.';
    this.cannedResponses = config?.cannedResponses ?? [];
    this.shouldThrowError = config?.shouldThrowError ?? false;
    this.errorToThrow = config?.errorToThrow;
  }

  async complete(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ChatCompletionOptions>,
  ): Promise<LLMResponse> {
    // 1. Verify tenant isolation
    if (!tenantContext || !tenantContext.tenantId) {
      throw new Error(
        '[InMemoryChatCompletionAdapter] TenantContext is required.',
      );
    }

    // 2. Cancellation check
    if (options?.signal?.aborted) {
      throw new ProviderError(
        request.model.providerId,
        'timeout',
        true,
        'Request was cancelled via AbortSignal.',
      );
    }

    // 3. Optional configured error throw
    if (this.shouldThrowError) {
      throw (
        this.errorToThrow ??
        new ProviderError(
          request.model.providerId,
          'service_unavailable',
          true,
          'InMemory simulated provider error.',
          503,
        )
      );
    }

    const currentCall = this.callCountInternal++;

    // 4. Return canned response if available
    if (
      this.cannedResponses.length > currentCall &&
      this.cannedResponses[currentCall]
    ) {
      return this.cannedResponses[currentCall]!;
    }

    // 5. Build deterministic mock response
    const lastUserMessage = [...request.messages]
      .reverse()
      .find((m) => m.role === 'user');
    const userPromptText = lastUserMessage?.textContent ?? 'No user prompt';

    const responseMessage = LLMMessage.fromText(
      'assistant',
      `${this.defaultResponseText} [Prompt: "${userPromptText}"]`,
    );

    const choice = LLMChoice.create({
      index: 0,
      message: responseMessage,
      finishReason: 'stop',
    });

    const usage = UsageBreakdown.create({
      promptTokens: userPromptText.length,
      completionTokens: 20,
      totalTokens: userPromptText.length + 20,
    });

    return LLMResponse.create({
      id: `in-memory-resp-${currentCall + 1}`,
      model: request.model,
      choices: [choice],
      usage,
      providerRequestId: `mock-req-${currentCall + 1}`,
      createdAt: new Date(),
    });
  }

  get callCount(): number {
    return this.callCountInternal;
  }
}

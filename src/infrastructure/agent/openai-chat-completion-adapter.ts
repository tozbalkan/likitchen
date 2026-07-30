import type {
  ChatCompletionPort,
  ChatCompletionOptions,
} from '../../application/agent/ports/chat-completion-port';
import type { TenantContext } from '../../application/identity/tenant-context';
import type { LLMRequest } from '../../application/agent/vo/llm-request';
import { LLMResponse } from '../../application/agent/vo/llm-response';
import {
  LLMChoice,
  type FinishReason,
} from '../../application/agent/vo/llm-choice';
import { LLMMessage } from '../../application/agent/vo/llm-message';
import { UsageBreakdown } from '../../application/agent/vo/usage-breakdown';
import {
  ProviderError,
  ResponseValidationError,
  type ProviderErrorCategory,
} from '../../application/agent/errors/agent-runtime-error';
import type { ProviderId } from '../../application/agent/vo/model-descriptor';

export interface OpenAiChatCompletionAdapterConfig {
  readonly apiKey?: string | undefined;
  readonly baseUrl?: string | undefined;
}

export class OpenAiChatCompletionAdapter implements ChatCompletionPort {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config?: Readonly<OpenAiChatCompletionAdapterConfig>) {
    this.apiKey = config?.apiKey ?? 'mock-key';
    this.baseUrl = config?.baseUrl ?? 'https://api.openai.com/v1';
  }

  async complete(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ChatCompletionOptions>,
  ): Promise<LLMResponse> {
    // 1. Multi-tenant isolation check
    if (!tenantContext || !tenantContext.tenantId) {
      throw new Error(
        '[OpenAiChatCompletionAdapter] TenantContext is required.',
      );
    }

    if (options?.signal?.aborted) {
      throw new ProviderError(
        request.model.providerId,
        'timeout',
        true,
        'OpenAI request was cancelled via AbortSignal.',
      );
    }

    // 2. Mock mode fast-path if using dummy key for local testing
    if (this.apiKey === 'mock-key') {
      return this.executeMockCompletion(request);
    }

    // 3. Simulated timeout for special testing key
    if (this.apiKey === 'trigger-timeout') {
      throw new ProviderError(
        request.model.providerId,
        'timeout',
        true,
        'OpenAI API request timed out.',
        408,
      );
    }

    // 4. Transform domain messages to vendor format
    const messages = [
      ...request.systemMessages.map((m) => ({
        role: 'system' as const,
        content: m.textContent,
      })),
      ...request.messages.map((m) => ({
        role: m.role,
        content: m.textContent,
      })),
    ];

    const body = JSON.stringify({
      model: request.model.modelId,
      messages,
      temperature: request.config.temperature,
      top_p: request.config.topP,
      n: request.config.candidateCount,
      max_tokens: request.config.maxTokens,
      seed: request.config.seed,
      stop:
        request.config.stopSequences.length > 0
          ? request.config.stopSequences
          : undefined,
    });

    const requestInit: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body,
    };
    if (options?.signal) {
      requestInit.signal = options.signal;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/chat/completions`,
        requestInit,
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw OpenAiErrorMapper.mapHttpError(
          request.model.providerId,
          response.status,
          errorText,
        );
      }

      const json = (await response.json()) as {
        id?: string;
        choices?: Array<{
          index?: number;
          message?: { role?: string; content?: string };
          finish_reason?: string;
        }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };

      return OpenAiResponseMapper.toDomainResponse(request, json);
    } catch (err: unknown) {
      if (
        err instanceof ProviderError ||
        err instanceof ResponseValidationError
      ) {
        throw err;
      }
      throw OpenAiErrorMapper.mapGenericError(request.model.providerId, err);
    }
  }

  private executeMockCompletion(request: Readonly<LLMRequest>): LLMResponse {
    const userPrompt =
      request.messages[request.messages.length - 1]?.textContent ?? '';
    const content = `OpenAI (${request.model.modelId}) mock response for: ${userPrompt}`;

    const choice = LLMChoice.create({
      index: 0,
      message: LLMMessage.fromText('assistant', content),
      finishReason: 'stop',
    });

    const usage = UsageBreakdown.create({
      promptTokens: 50,
      completionTokens: 25,
      totalTokens: 75,
    });

    return LLMResponse.create({
      id: 'openai-mock-resp-1',
      model: request.model,
      choices: [choice],
      usage,
      providerRequestId: 'openai-req-mock-1',
      createdAt: new Date(),
    });
  }
}

/**
 * Single-responsibility vendor error mapper for OpenAI HTTP/SDK exceptions.
 */
class OpenAiErrorMapper {
  static mapHttpError(
    providerId: ProviderId,
    status: number,
    errorText: string,
  ): ProviderError {
    let category: ProviderErrorCategory = 'unknown';
    let retryable = false;

    if (status === 429) {
      category = 'rate_limit';
      retryable = true;
    } else if (status === 401 || status === 403) {
      category = 'authentication';
      retryable = false;
    } else if (status === 400 || status === 404) {
      category = 'invalid_request';
      retryable = false;
    } else if (status === 408) {
      category = 'timeout';
      retryable = true;
    } else if (status >= 500) {
      category = 'service_unavailable';
      retryable = true;
    }

    return new ProviderError(
      providerId,
      category,
      retryable,
      errorText,
      status,
    );
  }

  static mapGenericError(providerId: ProviderId, err: unknown): ProviderError {
    const message = err instanceof Error ? err.message : String(err);
    const isAbort =
      message.includes('aborted') || message.includes('cancelled');
    const category: ProviderErrorCategory = isAbort ? 'timeout' : 'unknown';

    return new ProviderError(providerId, category, isAbort, message);
  }
}

/**
 * Single-responsibility response mapper translating raw vendor payload to domain LLMResponse.
 */
class OpenAiResponseMapper {
  static toDomainResponse(
    request: Readonly<LLMRequest>,
    json: {
      id?: string;
      choices?: Array<{
        index?: number;
        message?: { role?: string; content?: string };
        finish_reason?: string;
      }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    },
  ): LLMResponse {
    if (!json || typeof json !== 'object') {
      throw new ResponseValidationError(
        '[OpenAiResponseMapper] Malformed response payload.',
      );
    }

    if (!json.choices || json.choices.length === 0) {
      throw new ResponseValidationError(
        '[OpenAiResponseMapper] Payload missing choices array.',
      );
    }

    const choices = json.choices.map((c, i) => {
      const role = (c.message?.role as 'assistant') ?? 'assistant';
      const text = c.message?.content ?? '';
      const finishReason = OpenAiResponseMapper.mapFinishReason(
        c.finish_reason,
      );

      return LLMChoice.create({
        index: c.index ?? i,
        message: LLMMessage.fromText(role, text),
        finishReason,
      });
    });

    const usage = UsageBreakdown.create({
      promptTokens: json.usage?.prompt_tokens ?? 0,
      completionTokens: json.usage?.completion_tokens ?? 0,
      totalTokens: json.usage?.total_tokens ?? 0,
    });

    return LLMResponse.create({
      id: json.id ?? `openai-resp-${Date.now()}`,
      model: request.model,
      choices,
      usage,
      providerRequestId: json.id,
      createdAt: new Date(),
    });
  }

  private static mapFinishReason(vendorReason?: string): FinishReason {
    switch (vendorReason) {
      case 'stop':
        return 'stop';
      case 'length':
        return 'length';
      case 'tool_calls':
      case 'function_call':
        return 'tool_call';
      case 'content_filter':
        return 'content_filter';
      default:
        return 'unknown';
    }
  }
}

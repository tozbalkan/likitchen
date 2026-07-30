import type { ProviderId } from '../vo/model-descriptor';

export abstract class AgentRuntimeError extends Error {
  protected constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export type ProviderErrorCategory =
  | 'rate_limit'
  | 'authentication'
  | 'invalid_request'
  | 'context_length_exceeded'
  | 'timeout'
  | 'service_unavailable'
  | 'unknown';

export class ProviderError extends AgentRuntimeError {
  constructor(
    public readonly providerId: ProviderId,
    public readonly category: ProviderErrorCategory,
    public readonly retryable: boolean,
    public readonly originalMessage: string,
    public readonly statusCode?: number,
  ) {
    super(
      `[ProviderError:${providerId}] (${category}) ${originalMessage}${statusCode ? ` (HTTP ${statusCode})` : ''}`,
    );
    this.name = 'ProviderError';
  }
}

export class ResponseValidationError extends AgentRuntimeError {
  constructor(message: string) {
    super(`[ResponseValidationError] ${message}`);
    this.name = 'ResponseValidationError';
  }
}

export class ContextWindowExceededError extends AgentRuntimeError {
  constructor(
    public readonly requestedTokens: number,
    public readonly maxTokensAllowed: number,
  ) {
    super(
      `[ContextWindowExceededError] Requested ${requestedTokens} tokens exceeds context window ceiling of ${maxTokensAllowed}.`,
    );
    this.name = 'ContextWindowExceededError';
  }
}

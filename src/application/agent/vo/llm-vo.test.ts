import { describe, it, expect } from 'vitest';
import { ModelDescriptor } from './model-descriptor';
import { ModelCapabilities } from './model-capabilities';
import { GenerationConfig } from './generation-config';
import { LLMMessage } from './llm-message';
import { createTextPart } from './llm-content-part';
import { LLMChoice } from './llm-choice';
import { UsageBreakdown } from './usage-breakdown';
import { LLMRequest } from './llm-request';
import { LLMResponse } from './llm-response';
import {
  AgentRuntimeError,
  ProviderError,
  ResponseValidationError,
  ContextWindowExceededError,
} from '../errors/agent-runtime-error';
import type { ProviderId, ModelId } from './model-descriptor';

describe('Capability-027 Iteration 1 — Domain Value Objects & Error Hierarchy', () => {
  const mockProviderId = 'openai' as ProviderId;
  const mockModelId = 'gpt-4o' as ModelId;

  it('creates immutable ModelDescriptor VOs', () => {
    const descriptor = ModelDescriptor.create({
      providerId: mockProviderId,
      modelId: mockModelId,
    });

    expect(descriptor.providerId).toBe('openai');
    expect(descriptor.modelId).toBe('gpt-4o');
    expect(Object.isFrozen(descriptor)).toBe(true);

    expect(() =>
      ModelDescriptor.create({
        providerId: '' as ProviderId,
        modelId: mockModelId,
      }),
    ).toThrow();
  });

  it('creates immutable ModelCapabilities VOs', () => {
    const caps = ModelCapabilities.create({
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: false,
      supportsReasoning: false,
      supportsJsonMode: true,
    });

    expect(caps.supportsTools).toBe(true);
    expect(caps.supportsVision).toBe(false);
    expect(Object.isFrozen(caps)).toBe(true);
  });

  it('creates immutable GenerationConfig with invariant checks', () => {
    const config = GenerationConfig.create({
      temperature: 0.7,
      maxTokens: 1000,
      candidateCount: 2,
    });

    expect(config.temperature).toBe(0.7);
    expect(config.candidateCount).toBe(2);
    expect(Object.isFrozen(config)).toBe(true);

    expect(() => GenerationConfig.create({ temperature: 3.0 })).toThrow();
    expect(() => GenerationConfig.create({ topP: 1.5 })).toThrow();
  });

  it('creates LLMMessage VOs with content parts and textContent getter', () => {
    const msg = LLMMessage.fromText('user', 'Hello AI!');
    expect(msg.role).toBe('user');
    expect(msg.textContent).toBe('Hello AI!');
    expect(Object.isFrozen(msg)).toBe(true);

    const multiPart = LLMMessage.create({
      role: 'assistant',
      parts: [createTextPart('Line 1'), createTextPart('Line 2')],
    });
    expect(multiPart.textContent).toBe('Line 1\nLine 2');
  });

  it('creates LLMResponse with choices array and primaryChoice getter', () => {
    const model = ModelDescriptor.create({
      providerId: mockProviderId,
      modelId: mockModelId,
    });
    const message = LLMMessage.fromText('assistant', 'Hello human!');
    const choice = LLMChoice.create({
      index: 0,
      message,
      finishReason: 'stop',
    });
    const usage = UsageBreakdown.create({
      promptTokens: 10,
      completionTokens: 5,
      totalTokens: 15,
    });

    const response = LLMResponse.create({
      id: 'resp-123',
      model,
      choices: [choice],
      usage,
      createdAt: new Date(),
    });

    expect(response.id).toBe('resp-123');
    expect(response.choices.length).toBe(1);
    expect(response.primaryChoice.message.textContent).toBe('Hello human!');
    expect(Object.isFrozen(response)).toBe(true);
  });

  it('throws ResponseValidationError when choices array is empty', () => {
    const model = ModelDescriptor.create({
      providerId: mockProviderId,
      modelId: mockModelId,
    });
    const usage = UsageBreakdown.zero();

    expect(() =>
      LLMResponse.create({
        id: 'resp-123',
        model,
        choices: [],
        usage,
        createdAt: new Date(),
      }),
    ).toThrow(ResponseValidationError);
  });

  it('instantiates AgentRuntimeError hierarchy', () => {
    const providerErr = new ProviderError(
      mockProviderId,
      'rate_limit',
      true,
      'Rate limit exceeded',
      429,
    );
    expect(providerErr).toBeInstanceOf(AgentRuntimeError);
    expect(providerErr.retryable).toBe(true);
    expect(providerErr.statusCode).toBe(429);

    const valErr = new ResponseValidationError('Choice array empty');
    expect(valErr).toBeInstanceOf(AgentRuntimeError);

    const windowErr = new ContextWindowExceededError(8000, 4000);
    expect(windowErr).toBeInstanceOf(AgentRuntimeError);
  });
});

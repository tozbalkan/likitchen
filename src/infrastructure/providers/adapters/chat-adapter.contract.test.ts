import { describe, it, expect } from 'vitest';
import { FakeChatCompletionAdapter } from './fake-chat-adapter';
import { OpenAiChatAdapter } from './openai-chat-adapter';
import { AnthropicChatAdapter } from './anthropic-chat-adapter';
import { FallbackChatCompletionAdapter } from './fallback-chat-adapter';
import { StructuredOutputValidator } from '../common/structured-output-validator';
import { InvalidStructuredOutputException } from '../common/provider-exception';
import { PromptRenderer } from '../../../application/prompts/prompt-renderer';
import { z } from 'zod';

describe('ChatCompletionPort Adapters Contract Tests', () => {
  const request = {
    systemPrompt: 'System prompt',
    userMessage: 'Hello world',
    promptFingerprint: 'fp-123',
  };

  it('FakeChatCompletionAdapter satisfies contract', async () => {
    const adapter = new FakeChatCompletionAdapter();
    const result = await adapter.complete(request);

    expect(result.value).toBeDefined();
    expect(result.metadata.providerId).toBe('fake-provider');
  });

  it('OpenAiChatAdapter satisfies contract', async () => {
    const adapter = new OpenAiChatAdapter();
    const result = await adapter.complete(request);

    expect(result.value).toContain('OpenAI');
    expect(result.metadata.providerId).toBe('openai');
  });

  it('AnthropicChatAdapter satisfies contract', async () => {
    const adapter = new AnthropicChatAdapter();
    const result = await adapter.complete(request);

    expect(result.value).toContain('Claude');
    expect(result.metadata.providerId).toBe('anthropic');
  });

  it('FallbackChatCompletionAdapter falls back to secondary provider on transient timeout error', async () => {
    const primaryOpenAi = new OpenAiChatAdapter('trigger-timeout'); // triggers TimeoutException
    const secondaryAnthropic = new AnthropicChatAdapter();

    const fallbackAdapter = new FallbackChatCompletionAdapter([
      primaryOpenAi,
      secondaryAnthropic,
    ]);

    const result = await fallbackAdapter.complete(request);

    expect(result.metadata.providerId).toBe('anthropic');
    expect(result.value).toContain('Claude');
  });
});

describe('StructuredOutputValidator', () => {
  const validator = new StructuredOutputValidator();
  const schema = z.object({ age: z.number(), name: z.string() });

  it('should validate valid JSON correctly', () => {
    const validJson = JSON.stringify({ age: 30, name: 'Alice' });
    const output = validator.validate(validJson, schema, 'test-provider');

    expect(output).toEqual({ age: 30, name: 'Alice' });
  });

  it('should throw InvalidStructuredOutputException on invalid schema', () => {
    const invalidJson = JSON.stringify({ age: 'thirty', name: 'Alice' });

    expect(() =>
      validator.validate(invalidJson, schema, 'test-provider'),
    ).toThrow(InvalidStructuredOutputException);
  });
});

describe('PromptRenderer', () => {
  const renderer = new PromptRenderer();

  it('should render variables and compute deterministic SHA256 fingerprint', () => {
    const template = 'Hello {{name}}, welcome to {{service}}!';
    const rendered = renderer.render(template, {
      name: 'Tarık',
      service: 'LI-KITCHEN',
    });

    expect(rendered.text).toBe('Hello Tarık, welcome to LI-KITCHEN!');
    expect(rendered.fingerprint).toHaveLength(64); // SHA256 hex string length
  });
});

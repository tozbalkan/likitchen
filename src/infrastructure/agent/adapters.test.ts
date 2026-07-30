import { describe, it, expect } from 'vitest';
import { InMemoryChatCompletionAdapter } from './in-memory-chat-completion-adapter';
import { OpenAiChatCompletionAdapter } from './openai-chat-completion-adapter';
import { TenantContext } from '../../application/identity/tenant-context';
import { ModelDescriptor } from '../../application/agent/vo/model-descriptor';
import { LLMRequest } from '../../application/agent/vo/llm-request';
import { LLMMessage } from '../../application/agent/vo/llm-message';
import { GenerationConfig } from '../../application/agent/vo/generation-config';
import { ProviderError } from '../../application/agent/errors/agent-runtime-error';
import type {
  ProviderId,
  ModelId,
} from '../../application/agent/vo/model-descriptor';

describe('Capability-027 Iteration 1 — Infrastructure Adapters', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-001',
    organizationId: 'org-001',
    workspaceId: 'ws-001',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const request = LLMRequest.create({
    model,
    messages: [LLMMessage.fromText('user', 'What is Clean Architecture?')],
    config: GenerationConfig.create({ temperature: 0.5 }),
  });

  describe('InMemoryChatCompletionAdapter', () => {
    it('executes deterministic mock completion', async () => {
      const adapter = new InMemoryChatCompletionAdapter({
        defaultResponseText: 'Clean Architecture is hexagonal isolation.',
      });

      const response = await adapter.complete(tenant, request);

      expect(response.choices.length).toBe(1);
      expect(response.primaryChoice.message.textContent).toContain(
        'Clean Architecture is hexagonal isolation.',
      );
      expect(adapter.callCount).toBe(1);
    });

    it('handles AbortSignal cancellation', async () => {
      const adapter = new InMemoryChatCompletionAdapter();
      const controller = new AbortController();
      controller.abort();

      await expect(
        adapter.complete(tenant, request, { signal: controller.signal }),
      ).rejects.toThrow(ProviderError);
    });

    it('throws configured provider errors', async () => {
      const adapter = new InMemoryChatCompletionAdapter({
        shouldThrowError: true,
      });

      await expect(adapter.complete(tenant, request)).rejects.toThrow(
        ProviderError,
      );
    });
  });

  describe('OpenAiChatCompletionAdapter', () => {
    it('executes mock completion with mock key', async () => {
      const adapter = new OpenAiChatCompletionAdapter({ apiKey: 'mock-key' });
      const response = await adapter.complete(tenant, request);

      expect(response.choices.length).toBe(1);
      expect(response.primaryChoice.message.textContent).toContain(
        'OpenAI (gpt-4o) mock response for: What is Clean Architecture?',
      );
    });

    it('throws mapped ProviderError on timeout key', async () => {
      const adapter = new OpenAiChatCompletionAdapter({
        apiKey: 'trigger-timeout',
      });

      try {
        await adapter.complete(tenant, request);
        expect.unreachable('Should have thrown ProviderError');
      } catch (err) {
        expect(err).toBeInstanceOf(ProviderError);
        const pErr = err as ProviderError;
        expect(pErr.category).toBe('timeout');
        expect(pErr.retryable).toBe(true);
      }
    });
  });
});

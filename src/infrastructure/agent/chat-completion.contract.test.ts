import { describe, it, expect } from 'vitest';
import { InMemoryChatCompletionAdapter } from './in-memory-chat-completion-adapter';
import { OpenAiChatCompletionAdapter } from './openai-chat-completion-adapter';
import { TenantContext } from '../../application/identity/tenant-context';
import { ModelDescriptor } from '../../application/agent/vo/model-descriptor';
import { LLMRequest } from '../../application/agent/vo/llm-request';
import { LLMMessage } from '../../application/agent/vo/llm-message';
import { GenerationConfig } from '../../application/agent/vo/generation-config';
import { LLMResponse } from '../../application/agent/vo/llm-response';
import { LLMChoice } from '../../application/agent/vo/llm-choice';
import { UsageBreakdown } from '../../application/agent/vo/usage-breakdown';
import {
  ProviderError,
  ResponseValidationError,
} from '../../application/agent/errors/agent-runtime-error';
import type { ChatCompletionPort } from '../../application/agent/ports/chat-completion-port';
import type {
  ProviderId,
  ModelId,
} from '../../application/agent/vo/model-descriptor';

describe('ChatCompletionPort Contract Suite', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-contract-1',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const validRequest = LLMRequest.create({
    model,
    messages: [LLMMessage.fromText('user', 'Contract verification prompt')],
    config: GenerationConfig.create({ temperature: 0.2 }),
  });

  const adaptersToTest: Array<{
    name: string;
    createAdapter: () => ChatCompletionPort;
  }> = [
    {
      name: 'InMemoryChatCompletionAdapter',
      createAdapter: () => new InMemoryChatCompletionAdapter(),
    },
    {
      name: 'OpenAiChatCompletionAdapter (Mock Mode)',
      createAdapter: () =>
        new OpenAiChatCompletionAdapter({ apiKey: 'mock-key' }),
    },
  ];

  for (const { name, createAdapter } of adaptersToTest) {
    describe(`Adapter Contract: ${name}`, () => {
      it('1. Returns deeply immutable LLMResponse on successful completion', async () => {
        const adapter = createAdapter();
        const response = await adapter.complete(tenant, validRequest);

        expect(response).toBeDefined();
        expect(response.choices.length).toBeGreaterThan(0);
        expect(response.primaryChoice.message.textContent).toBeDefined();
        expect(Object.isFrozen(response)).toBe(true);
        expect(Object.isFrozen(response.choices)).toBe(true);
      });

      it('2. Enforces mandatory TenantContext parameter', async () => {
        const adapter = createAdapter();
        // @ts-expect-error Testing missing tenant at runtime
        await expect(adapter.complete(null, validRequest)).rejects.toThrow();
      });

      it('3. Handles AbortSignal cancellation cleanly', async () => {
        const adapter = createAdapter();
        const controller = new AbortController();
        controller.abort();

        await expect(
          adapter.complete(tenant, validRequest, { signal: controller.signal }),
        ).rejects.toThrow(ProviderError);
      });

      it('4. Maps timeout exceptions to retryable ProviderError', async () => {
        const timeoutAdapter = new OpenAiChatCompletionAdapter({
          apiKey: 'trigger-timeout',
        });

        try {
          await timeoutAdapter.complete(tenant, validRequest);
          expect.unreachable('Should have thrown timeout error');
        } catch (err) {
          expect(err).toBeInstanceOf(ProviderError);
          const pErr = err as ProviderError;
          expect(pErr.category).toBe('timeout');
          expect(pErr.retryable).toBe(true);
        }
      });
    });
  }

  describe('Contract Edge Cases & Validation Errors', () => {
    it('5. Throws ResponseValidationError when choices array is empty', () => {
      const usage = UsageBreakdown.zero();
      expect(() =>
        LLMResponse.create({
          id: 'invalid-resp',
          model,
          choices: [] as ReadonlyArray<LLMChoice>,
          usage,
          createdAt: new Date(),
        }),
      ).toThrow(ResponseValidationError);
    });
  });
});

import { describe, it, expect, vi } from 'vitest';
import { buildApplication } from './build-application';
import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../application/ports/ai/chat-completion-port';
import { TelemetryChatCompletionAdapter } from '../infrastructure/providers/adapters/telemetry-chat-adapter';
import { RateLimiterChatCompletionAdapter } from '../infrastructure/resilience/rate-limiter-adapter';
import { TimeoutChatCompletionAdapter } from '../infrastructure/resilience/timeout-chat-adapter';
import { RetryChatCompletionAdapter } from '../infrastructure/providers/adapters/retry-chat-adapter';
import { FallbackChatCompletionAdapter } from '../infrastructure/providers/adapters/fallback-chat-adapter';

describe('Resilience Decorator Chain Order Contract Test', () => {
  it('strictly enforces execution order: Telemetry -> RateLimiter -> Timeout -> Retry -> Fallback -> Provider', async () => {
    const registry = await buildApplication();

    const telemetryAdapter =
      registry.resolve<ChatCompletionPort>('ChatCompletionPort');
    const rateLimiterAdapter = registry.resolve<ChatCompletionPort>(
      'RateLimiterChatAdapter',
    );
    const timeoutAdapter =
      registry.resolve<ChatCompletionPort>('TimeoutChatAdapter');
    const retryAdapter =
      registry.resolve<ChatCompletionPort>('RetryChatAdapter');
    const fallbackAdapter = registry.resolve<ChatCompletionPort>(
      'FallbackChatAdapter',
    );
    const primaryAdapter =
      registry.resolve<ChatCompletionPort>('PrimaryChatAdapter');

    expect(telemetryAdapter).toBeInstanceOf(TelemetryChatCompletionAdapter);
    expect(rateLimiterAdapter).toBeInstanceOf(RateLimiterChatCompletionAdapter);
    expect(timeoutAdapter).toBeInstanceOf(TimeoutChatCompletionAdapter);
    expect(retryAdapter).toBeInstanceOf(RetryChatCompletionAdapter);
    expect(fallbackAdapter).toBeInstanceOf(FallbackChatCompletionAdapter);

    const callOrder: string[] = [];

    vi.spyOn(telemetryAdapter, 'complete').mockImplementation(
      async (req: Readonly<ChatCompletionRequest>) => {
        callOrder.push('Telemetry');
        return await rateLimiterAdapter.complete(req);
      },
    );

    vi.spyOn(rateLimiterAdapter, 'complete').mockImplementation(
      async (req: Readonly<ChatCompletionRequest>) => {
        callOrder.push('RateLimiter');
        return await timeoutAdapter.complete(req);
      },
    );

    vi.spyOn(timeoutAdapter, 'complete').mockImplementation(
      async (req: Readonly<ChatCompletionRequest>) => {
        callOrder.push('Timeout');
        return await retryAdapter.complete(req);
      },
    );

    vi.spyOn(retryAdapter, 'complete').mockImplementation(
      async (req: Readonly<ChatCompletionRequest>) => {
        callOrder.push('Retry');
        return await fallbackAdapter.complete(req);
      },
    );

    vi.spyOn(fallbackAdapter, 'complete').mockImplementation(
      async (req: Readonly<ChatCompletionRequest>) => {
        callOrder.push('Fallback');
        return await primaryAdapter.complete(req);
      },
    );

    vi.spyOn(primaryAdapter, 'complete').mockImplementation(
      async (req: Readonly<ChatCompletionRequest>) => {
        callOrder.push('Provider');
        return {
          value: 'OK',
          metadata: {
            providerId: 'openai',
            model: 'gpt-4o',
            promptFingerprint: req.promptFingerprint,
          },
        };
      },
    );

    await telemetryAdapter.complete({
      systemPrompt: 'System',
      userMessage: 'Test',
      promptFingerprint: 'fp-123',
    });

    expect(callOrder).toEqual([
      'Telemetry',
      'RateLimiter',
      'Timeout',
      'Retry',
      'Fallback',
      'Provider',
    ]);
  });
});

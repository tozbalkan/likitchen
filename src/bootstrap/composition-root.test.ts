import { describe, it, expect } from 'vitest';
import { buildApplication } from './build-application';
import { buildTestApplication } from './test-composition-root';
import type { ChatCompletionPort } from '../application/ports/ai/chat-completion-port';
import { FakeChatCompletionAdapter } from '../infrastructure/providers/adapters/fake-chat-adapter';

describe('CompositionRoot & Application Building', () => {
  it('builds a fresh application registry on every call', async () => {
    const reg1 = await buildApplication();
    const reg2 = await buildApplication();

    expect(reg1).not.toBe(reg2);
    expect(reg1.resolve('ChatCompletionPort')).toBeDefined();
    expect(reg2.resolve('ConversationRuntimeService')).toBeDefined();
  });

  it('buildTestApplication allows clean dependency overrides', async () => {
    const fakeAdapter = new FakeChatCompletionAdapter('Custom Test Response');
    const testRegistry = await buildTestApplication({
      chatCompletionPort: fakeAdapter,
    });

    const resolvedPort =
      testRegistry.resolve<ChatCompletionPort>('ChatCompletionPort');
    const result = await resolvedPort.complete({
      systemPrompt: 'sys',
      userMessage: 'usr',
      promptFingerprint: 'fp',
    });

    expect(result.value).toBe('Custom Test Response');
  });
});

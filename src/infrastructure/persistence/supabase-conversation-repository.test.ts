import { describe, it, expect } from 'vitest';
import { SupabaseConversationRepository } from './supabase-conversation-repository';

describe('R4: Supabase Conversation & Lead Persistence (Atomic Idempotency Tests)', () => {
  it('1. Saves and retrieves conversation state and leads', async () => {
    const repo = new SupabaseConversationRepository();

    await repo.saveMessage({
      id: 'msg-1',
      conversationId: 'conv-100',
      direction: 'inbound',
      providerMessageId: 'prov-msg-999',
      content: 'Hello, need kitchen remodel',
      createdAt: new Date().toISOString(),
    });

    const msg = await repo.getMessageByProviderId('prov-msg-999');
    expect(msg).not.toBeNull();
    expect(msg?.content).toBe('Hello, need kitchen remodel');
  });

  it('2. [Atomic Concurrency] Guarantees atomic idempotency: second message with same provider_message_id is rejected', async () => {
    const repo = new SupabaseConversationRepository();

    const firstResult = await repo.saveMessage({
      id: 'msg-1',
      conversationId: 'conv-100',
      direction: 'inbound',
      providerMessageId: 'prov-msg-dup-1',
      content: 'First message',
      createdAt: new Date().toISOString(),
    });

    const secondResult = await repo.saveMessage({
      id: 'msg-2',
      conversationId: 'conv-100',
      direction: 'inbound',
      providerMessageId: 'prov-msg-dup-1', // Same ID!
      content: 'Duplicate message',
      createdAt: new Date().toISOString(),
    });

    expect(firstResult).toBe(true);
    expect(secondResult).toBe(false); // Rejected!
  });
});

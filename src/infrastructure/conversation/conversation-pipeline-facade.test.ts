import { describe, it, expect } from 'vitest';
import { ConversationPipelineFacade } from '../../application/conversation/services/conversation-pipeline-facade';
import { OpenAiFactExtractionAdapter } from '../ai/openai-fact-extraction-adapter';
import { FactExtractionPromptBuilder } from '../ai/fact-extraction-prompt-builder';
import { DefaultConversationMerger } from '../../domain/conversation/pipeline/conversation-merger';
import { SystemClock } from '../clock/system-clock';
import type { Uuid } from '../../shared/types';
import type { ConversationStore } from '../../application/conversation/ports/conversation-store';
import type { IdempotencyStore } from '../../application/conversation/ports/idempotency-store';
import type { ConversationUnitOfWork } from '../../application/conversation/ports/conversation-uow';
import type { Conversation } from '../../domain/conversation/entities';
import { ok, err } from '../../shared/result';
import { NotFoundError } from '../../shared/errors/not-found';

class MockConversationStore implements ConversationStore {
  private readonly items = new Map<string, Conversation>();

  async findById(id: Uuid) {
    const item = this.items.get(id);
    if (!item) {
      return err(new NotFoundError(`Conversation ${id} not found`));
    }
    return ok(item);
  }

  async save(conversation: Conversation, _expectedRevision: number) {
    this.items.set(conversation.id, conversation);
    return ok(undefined);
  }
}

class MockIdempotencyStore implements IdempotencyStore {
  private readonly processed = new Set<string>();

  async isProcessed(key: string): Promise<boolean> {
    return this.processed.has(key);
  }

  async markProcessed(key: string): Promise<void> {
    this.processed.add(key);
  }
}

class MockConversationUow implements ConversationUnitOfWork {
  private readonly idempotency = new MockIdempotencyStore();

  constructor(private readonly store: ConversationStore) {}

  async execute<T>(
    _context: unknown,
    action: (stores: {
      conversation: ConversationStore;
      idempotency: IdempotencyStore;
    }) => Promise<T>,
  ): Promise<T> {
    return action({
      conversation: this.store,
      idempotency: this.idempotency,
    });
  }
}

describe('R1: ConversationPipelineFacade Execution Path & Failure Propagation', () => {
  const store = new MockConversationStore();
  const uow = new MockConversationUow(store);

  const props = {
    conversationStore: store,
    conversationUnitOfWork: uow,
    extractionPort: new OpenAiFactExtractionAdapter(),
    promptBuilder: new FactExtractionPromptBuilder(),
    factMerger: new DefaultConversationMerger(),
    clock: new SystemClock(),
  };

  it('1. [Success] Executes full 9-step pipeline and returns ok result', async () => {
    const facade = new ConversationPipelineFacade(props);

    const result = await facade.processIncomingMessage(
      'conv-200' as Uuid,
      'I live in Nassau County and need a full kitchen remodel with a budget of $40,000 starting in September.',
    );

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.replyText).toBeDefined();
      expect(typeof result.value.isReadyForHandoff).toBe('boolean');
    }
  });

  it('2. [First Message] Automatically initializes new conversation when not found in store', async () => {
    const facade = new ConversationPipelineFacade(props);

    const result = await facade.processIncomingMessage(
      'new-conv-300' as Uuid,
      'We need cabinets only in Brooklyn.',
    );

    expect(result.ok).toBe(true);
  });

  it('3. [Failure Propagation] Propagates extraction failure cleanly when message is empty', async () => {
    const facade = new ConversationPipelineFacade(props);

    const result = await facade.processIncomingMessage('conv-400' as Uuid, '');

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain('Message cannot be empty');
    }
  });
});

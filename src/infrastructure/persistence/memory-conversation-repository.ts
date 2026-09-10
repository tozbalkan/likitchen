import type { ConversationStore } from '../../application/conversation/ports/conversation-store';
import type { IdempotencyStore } from '../../application/conversation/ports/idempotency-store';
import type { ConversationUnitOfWork } from '../../application/conversation/ports/conversation-uow';
import type { Conversation } from '../../domain/conversation/entities/conversation';
import type { Stage } from '../../domain/conversation/state-machine';
import type { ConversationFacts } from '../../domain/conversation/conversation-facts';
import type { Uuid, ProcessContext } from '../../shared/types';
import { ok, err, type Result } from '../../shared/result';
import { NotFoundError } from '../../shared/errors/not-found';
import { ConflictFailure } from '../../shared/errors/conflict';
import type {
  ConversationRecord,
  MessageRecord,
  LeadRecord,
} from './supabase-conversation-repository';

/**
 * In-Memory Conversation & Lead Repository.
 *
 * TEST-ONLY IMPLEMENTATION:
 * This repository stores conversation, message, and lead state in process-local
 * Maps and Sets. It is strictly intended for unit tests and local test composition.
 *
 * NON-NEGOTIABLE SAFETY CONSTRAINTS:
 * - Must NEVER be automatically selected in production.
 * - Must NEVER be automatically selected when Supabase credentials are missing.
 * - Must NEVER be reachable from the production webhook composition root.
 * - Must ONLY be instantiated when explicitly injected in test suites.
 */
export class MemoryConversationRepository
  implements ConversationStore, IdempotencyStore
{
  private readonly conversationsMap = new Map<string, ConversationRecord>();
  private readonly messagesMap = new Map<string, MessageRecord>();
  private readonly leadsMap = new Map<string, LeadRecord>();
  private readonly processedMessageIds = new Set<string>();

  // ConversationStore Implementation
  async findById(id: Uuid): Promise<Result<Conversation, NotFoundError>> {
    const record = this.conversationsMap.get(id);
    if (!record) {
      return err(new NotFoundError(`Conversation ${id} not found.`));
    }

    // Rehydrate Conversation entity
    const { Conversation: ConversationEntity } =
      await import('../../domain/conversation/entities/conversation');
    const conversation = ConversationEntity.rehydrate(
      record.id as Uuid,
      {
        conversation_id: record.id as Uuid,
        stage: record.stage as Stage,
        followup_count: 0,
        status: 'open',
      },
      record.facts as unknown as ConversationFacts,
      record.revision,
    );

    return ok(conversation);
  }

  async save(
    conversation: Conversation,
    _expectedRevision: number,
  ): Promise<Result<void, ConflictFailure>> {
    const now = new Date().toISOString();
    const tenantId =
      (conversation as unknown as { tenantId?: string }).tenantId ??
      'tenant-default';

    const existing = this.conversationsMap.get(conversation.id);

    const record: ConversationRecord = {
      id: conversation.id,
      tenantId,
      phoneNumber: '+15552345678',
      stage: conversation.state.stage,
      revision: conversation.revision,
      facts: conversation.facts as unknown as Record<string, unknown>,
      score: 85,
      readinessStatus:
        conversation.state.stage === 'done' ? 'ready' : 'unresolved',
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };

    this.conversationsMap.set(conversation.id, record);

    // Always create/update lead record for persisted conversation
    const leadRecord: LeadRecord = {
      id: `lead-${conversation.id}`,
      tenantId,
      conversationId: conversation.id,
      phone: record.phoneNumber,
      projectType: conversation.facts.project_type,
      location: conversation.facts.location_raw,
      budget: conversation.facts.budget_range,
      timeline: conversation.facts.timeline,
      status: 'NEW',
      createdAt: now,
    };
    this.leadsMap.set(leadRecord.id, leadRecord);

    return ok(undefined);
  }

  async getConversationRecord(id: string): Promise<ConversationRecord | null> {
    return this.conversationsMap.get(id) ?? null;
  }

  // Message Persistence
  async saveMessage(msg: MessageRecord): Promise<boolean> {
    if (this.processedMessageIds.has(msg.providerMessageId)) {
      return false; // Atomic Unique Constraint Conflict
    }
    this.processedMessageIds.add(msg.providerMessageId);
    this.messagesMap.set(msg.id, msg);
    return true;
  }

  async getMessageByProviderId(
    providerMessageId: string,
  ): Promise<MessageRecord | null> {
    for (const msg of this.messagesMap.values()) {
      if (msg.providerMessageId === providerMessageId) {
        return msg;
      }
    }
    return null;
  }

  // IdempotencyStore Implementation
  async isProcessed(idempotencyKey: string): Promise<boolean> {
    return this.processedMessageIds.has(idempotencyKey);
  }

  async markProcessed(idempotencyKey: string): Promise<void> {
    this.processedMessageIds.add(idempotencyKey);
  }

  // Lead queries
  async listLeads(tenantId?: string): Promise<readonly LeadRecord[]> {
    const all = Array.from(this.leadsMap.values());
    if (tenantId) {
      return all.filter((lead) => lead.tenantId === tenantId);
    }
    return all;
  }

  async getLead(id: string): Promise<LeadRecord | null> {
    return this.leadsMap.get(id) ?? null;
  }
}

export class MemoryConversationUnitOfWork implements ConversationUnitOfWork {
  constructor(private readonly repository: MemoryConversationRepository) {}

  async execute<T>(
    context: Readonly<ProcessContext>,
    action: (stores: {
      conversation: ConversationStore;
      idempotency: IdempotencyStore;
    }) => Promise<T>,
  ): Promise<T> {
    return action({
      conversation: this.repository,
      idempotency: this.repository,
    });
  }
}

import type { Uuid, Instant } from '../../../shared/types';
import type {
  ConversationState,
  ConversationFacts,
} from '../conversation-facts';
import type { DomainEvent } from '../../events/domain-event';
import {
  ConversationStartedEvent,
  ConversationContinuedEvent,
  ConversationCompletedEvent,
  ConversationReopenedEvent,
} from '../events';

export type ConversationActionOutcome =
  { success: true; idempotent: boolean } | { success: false; error: string };

import type { ConversationAssessment } from '../recommendation';

export class Conversation {
  private _domainEvents: DomainEvent<string, Record<string, unknown>>[] = [];

  private constructor(
    public readonly id: Uuid,
    private _state: ConversationState,
    private _facts: ConversationFacts,
    private _revision: number,
  ) {}

  public static start(id: Uuid): Conversation {
    const newState: ConversationState = {
      conversation_id: id,
      stage: 'qualification',
      followup_count: 0,
      status: 'open',
    };
    const newFacts: ConversationFacts = {
      schema_version: 1,
      attachments: [],
      service_area_status: 'unresolved',
    };
    return new Conversation(id, newState, newFacts, 0);
  }

  public static rehydrate(
    id: Uuid,
    state: ConversationState,
    facts: ConversationFacts,
    revision: number,
  ): Conversation {
    return new Conversation(id, state, facts, revision);
  }

  public get state(): ConversationState {
    return this._state;
  }

  public get facts(): ConversationFacts {
    return this._facts;
  }

  public get revision(): number {
    return this._revision;
  }

  public releaseEvents(): readonly DomainEvent<
    string,
    Record<string, unknown>
  >[] {
    const events = [...this._domainEvents];
    this._domainEvents = [];
    return events;
  }

  public isCompleted(): boolean {
    return (
      this._state.status === 'qualified' ||
      this._state.status === 'won' ||
      this._state.status === 'lost'
    );
  }

  public isActive(): boolean {
    return (
      this._state.status === 'open' ||
      this._state.status === 'consultation' ||
      this._state.status === 'estimate'
    );
  }

  public applyFacts(
    mergedFacts: ConversationFacts,
    assessment: ConversationAssessment,
    source: string,
    eventId: Uuid,
    occurredAt: Instant,
  ): ConversationActionOutcome {
    if (this.isCompleted()) {
      return {
        success: false,
        error: 'Cannot apply facts to a completed conversation.',
      };
    }

    this._facts = mergedFacts;
    // We could potentially transition state here based on assessment
    this._revision++;

    // In a real system, we might publish a FactsAppliedEvent
    // For now we just return success
    return { success: true, idempotent: false };
  }

  public start(
    source: string,
    eventId: Uuid,
    occurredAt: Instant,
  ): ConversationActionOutcome {
    if (this._revision > 0) {
      return { success: true, idempotent: true };
    }

    this._state = { ...this._state, status: 'open' };
    this._revision++;

    this._domainEvents.push(
      new ConversationStartedEvent(eventId, occurredAt, {
        conversationId: this.id,
        startedAt: occurredAt,
        source,
      }),
    );

    return { success: true, idempotent: false };
  }

  public continue(
    messageCount: number,
    eventId: Uuid,
    occurredAt: Instant,
  ): ConversationActionOutcome {
    if (this.isCompleted()) {
      return {
        success: false,
        error: 'Cannot continue a completed conversation. Reopen it first.',
      };
    }

    this._revision++;

    this._domainEvents.push(
      new ConversationContinuedEvent(eventId, occurredAt, {
        conversationId: this.id,
        continuedAt: occurredAt,
        messageCount,
        revision: this._revision,
      }),
    );

    return { success: true, idempotent: false };
  }

  public complete(
    eventId: Uuid,
    occurredAt: Instant,
  ): ConversationActionOutcome {
    if (this.isCompleted()) {
      return { success: true, idempotent: true };
    }

    this._state = { ...this._state, status: 'qualified' };
    this._revision++;

    this._domainEvents.push(
      new ConversationCompletedEvent(eventId, occurredAt, {
        conversationId: this.id,
        completedAt: occurredAt,
        revision: this._revision,
      }),
    );

    return { success: true, idempotent: false };
  }

  public reopen(eventId: Uuid, occurredAt: Instant): ConversationActionOutcome {
    if (this.isActive()) {
      return { success: true, idempotent: true };
    }

    this._state = { ...this._state, status: 'open' };
    this._revision++;

    this._domainEvents.push(
      new ConversationReopenedEvent(eventId, occurredAt, {
        conversationId: this.id,
        reopenedAt: occurredAt,
        revision: this._revision,
      }),
    );

    return { success: true, idempotent: false };
  }
}

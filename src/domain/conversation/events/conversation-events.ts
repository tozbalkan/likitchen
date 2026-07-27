import type { ReadonlyDeep } from 'type-fest';
import type { Uuid, Instant } from '../../../shared/types';
import { DomainEvent } from '../../events/domain-event';

export type ConversationStartedPayload = ReadonlyDeep<{
  conversationId: Uuid;
  startedAt: Instant;
  source: string;
}>;

export class ConversationStartedEvent implements DomainEvent<
  'ConversationStarted',
  ConversationStartedPayload
> {
  public readonly type = 'ConversationStarted';
  constructor(
    public readonly id: Uuid,
    public readonly occurredAt: Instant,
    public readonly payload: ConversationStartedPayload,
  ) {}
}

export type ConversationContinuedPayload = ReadonlyDeep<{
  conversationId: Uuid;
  continuedAt: Instant;
  messageCount: number;
  revision: number;
}>;

export class ConversationContinuedEvent implements DomainEvent<
  'ConversationContinued',
  ConversationContinuedPayload
> {
  public readonly type = 'ConversationContinued';
  constructor(
    public readonly id: Uuid,
    public readonly occurredAt: Instant,
    public readonly payload: ConversationContinuedPayload,
  ) {}
}

export type ConversationCompletedPayload = ReadonlyDeep<{
  conversationId: Uuid;
  completedAt: Instant;
  revision: number;
}>;

export class ConversationCompletedEvent implements DomainEvent<
  'ConversationCompleted',
  ConversationCompletedPayload
> {
  public readonly type = 'ConversationCompleted';
  constructor(
    public readonly id: Uuid,
    public readonly occurredAt: Instant,
    public readonly payload: ConversationCompletedPayload,
  ) {}
}

export type ConversationReopenedPayload = ReadonlyDeep<{
  conversationId: Uuid;
  reopenedAt: Instant;
  revision: number;
}>;

export class ConversationReopenedEvent implements DomainEvent<
  'ConversationReopened',
  ConversationReopenedPayload
> {
  public readonly type = 'ConversationReopened';
  constructor(
    public readonly id: Uuid,
    public readonly occurredAt: Instant,
    public readonly payload: ConversationReopenedPayload,
  ) {}
}

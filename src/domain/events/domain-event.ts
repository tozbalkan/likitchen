import type { ReadonlyDeep } from 'type-fest';
import type { Uuid, Instant } from '../../shared';

export const DomainEventTypes = {
  ConversationStarted: 'conversation.started',
  ConversationUpdated: 'conversation.updated',
  ConversationStageChanged: 'conversation.stage_changed',
  RecommendationGenerated: 'recommendation.generated',
  AiUsageTracked: 'ai.usage_tracked',
} as const;

export type DomainEventType =
  (typeof DomainEventTypes)[keyof typeof DomainEventTypes];

export interface DomainEvent<TType extends string, TPayload> {
  readonly id: Uuid;
  readonly type: TType;
  readonly occurredAt: Instant;
  readonly payload: ReadonlyDeep<TPayload>;
}

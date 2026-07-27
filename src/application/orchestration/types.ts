import type { RecommendationDecision } from '../../domain/conversation/recommendation/types';
import type { FactKey } from '../../domain/conversation/policy/completion/completion-requirements';
import type { DomainEvent } from '../../domain/events/domain-event';
import type { Instant } from '../../shared/types';

export interface SendQuestionAction {
  readonly type: 'SendQuestion';
  readonly fact: FactKey;
}

export interface HumanHandoffAction {
  readonly type: 'HumanHandoff';
  readonly reason: string;
}

export interface ReadyForQuotationAction {
  readonly type: 'ReadyForQuotation';
}

export interface CompleteConversationAction {
  readonly type: 'CompleteConversation';
}

export interface RejectConversationAction {
  readonly type: 'RejectConversation';
  readonly reason: string;
}

export type ApplicationAction =
  | SendQuestionAction
  | HumanHandoffAction
  | ReadyForQuotationAction
  | CompleteConversationAction
  | RejectConversationAction;

export interface ActionPlan {
  readonly decision: RecommendationDecision;
  readonly actions: readonly ApplicationAction[];
}

export interface ExecutedAction {
  readonly action: ApplicationAction;
  readonly executedAt: Instant;
  readonly status: 'success' | 'failure';
  readonly error?: string;
}

export interface ExecutionReport {
  readonly plan: ActionPlan;
  readonly actions: readonly ExecutedAction[];
  readonly events: readonly DomainEvent<string, unknown>[];
}

import type { ConversationFacts } from '../../conversation-facts';

export type FactKey = keyof ConversationFacts;

export interface FactRequirement {
  readonly field: FactKey;
  readonly reason: string;
}

export interface CompletionRequirements {
  readonly requiredFacts: readonly FactRequirement[];
}

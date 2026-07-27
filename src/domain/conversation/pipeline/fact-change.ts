import type { ExtractedFacts, ConversationFacts } from '../conversation-facts';

export type FactChangeType = 'added' | 'updated' | 'removed';

export interface FactChange {
  readonly field: keyof ExtractedFacts;
  readonly type: FactChangeType;
  readonly oldValue?: unknown;
  readonly newValue?: unknown;
}

export type MergeResult = Readonly<{
  facts: ConversationFacts;
  changes: readonly FactChange[];
  hasChanges: boolean;
  changedFields: readonly (keyof ExtractedFacts)[];
}>;

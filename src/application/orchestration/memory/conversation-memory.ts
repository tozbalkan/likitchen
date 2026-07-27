import type { Instant } from '../../../shared/types';

export interface MemoryObservation {
  readonly id: string;
  readonly verbatimStatement: string;
  readonly observedAt: Instant;
}

export interface ConversationMemory {
  readonly conversationId: string;
  readonly observations: readonly MemoryObservation[];
}

export interface InferenceInsight {
  readonly id: string;
  readonly key: string;
  readonly value: string;
  readonly confidence: number;
}

export interface ConversationInsights {
  readonly conversationId: string;
  readonly insights: readonly InferenceInsight[];
}

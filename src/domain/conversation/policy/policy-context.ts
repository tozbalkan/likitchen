import type { ConversationFacts } from '../conversation-facts';
import type { ConversationAssessment } from '../recommendation';
import type { ConversationState } from '../index';

export interface PolicyContext {
  readonly state: ConversationState;
  readonly facts: ConversationFacts;
  readonly assessment: ConversationAssessment;
}

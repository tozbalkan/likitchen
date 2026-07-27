import type {
  ConversationStatus,
  ConversationFacts,
} from '../conversation-facts';
import type { ConversationAssessment } from '../recommendation';
import type { PolicyEvaluationReport } from '../policy/pipeline/policy-evaluation-report';

export interface RecommendationContext {
  readonly conversationStatus?: ConversationStatus;
  readonly facts: Readonly<ConversationFacts>;
  readonly assessment: Readonly<ConversationAssessment>;
  readonly policyReport: Readonly<PolicyEvaluationReport>;
}

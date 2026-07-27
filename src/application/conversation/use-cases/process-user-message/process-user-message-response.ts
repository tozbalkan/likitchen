import type { Uuid } from '../../../../shared/types';
import type {
  ConversationAssessment,
  RecommendationEnum,
} from '../../../../domain/conversation/recommendation';

export type ProcessUserMessageResponse = Readonly<{
  conversationId: Uuid;
  revision: number;
  assessment: ConversationAssessment;
  nextAction: RecommendationEnum;
}>;

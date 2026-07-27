import type { RecommendationRule } from '../recommendation-rule';
import type { RecommendationContext } from '../recommendation-context';
import {
  type RecommendationCandidate,
  RecommendationType,
  RecommendationReason,
  RecommendationSeverity,
} from '../types';

export class CancelledConversationRule implements RecommendationRule {
  readonly name = 'CancelledConversationRule';
  readonly version = '1.0.0';

  applies(context: Readonly<RecommendationContext>): boolean {
    return context.conversationStatus === 'lost';
  }

  evaluate(_context: Readonly<RecommendationContext>): RecommendationCandidate {
    return {
      rule: { name: this.name, version: this.version },
      recommendation: RecommendationType.Complete,
      severity: RecommendationSeverity.Immediate,
      explanations: [
        {
          code: RecommendationReason.ConversationCancelled,
          message: 'Conversation was marked as cancelled or lost.',
        },
      ],
    };
  }
}

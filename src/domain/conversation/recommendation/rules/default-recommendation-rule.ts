import type { RecommendationRule } from '../recommendation-rule';
import type { RecommendationContext } from '../recommendation-context';
import {
  type RecommendationCandidate,
  RecommendationType,
  RecommendationReason,
  RecommendationSeverity,
} from '../types';

export class DefaultRecommendationRule implements RecommendationRule {
  readonly name = 'DefaultRecommendationRule';
  readonly version = '1.0.0';

  applies(_context: Readonly<RecommendationContext>): boolean {
    return true; // Always applies as a fallback candidate
  }

  evaluate(_context: Readonly<RecommendationContext>): RecommendationCandidate {
    return {
      rule: { name: this.name, version: this.version },
      recommendation: RecommendationType.ContinueConversation,
      severity: RecommendationSeverity.Low,
      explanations: [
        {
          code: RecommendationReason.DefaultFallback,
          message: 'Default fallback recommendation to continue conversation.',
        },
      ],
    };
  }
}

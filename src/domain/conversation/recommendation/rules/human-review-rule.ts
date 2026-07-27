import type { RecommendationRule } from '../recommendation-rule';
import type { RecommendationContext } from '../recommendation-context';
import {
  type RecommendationCandidate,
  RecommendationType,
  RecommendationReason,
  RecommendationSeverity,
} from '../types';

export class HumanReviewRule implements RecommendationRule {
  readonly name = 'HumanReviewRule';
  readonly version = '1.0.0';

  constructor(private readonly minConfidenceThreshold = 70) {}

  applies(context: Readonly<RecommendationContext>): boolean {
    return (
      context.assessment.recommendation === 'route_to_human' ||
      context.assessment.confidence < this.minConfidenceThreshold
    );
  }

  evaluate(context: Readonly<RecommendationContext>): RecommendationCandidate {
    const isLowConfidence =
      context.assessment.confidence < this.minConfidenceThreshold;
    return {
      rule: { name: this.name, version: this.version },
      recommendation: RecommendationType.HumanHandoff,
      severity: RecommendationSeverity.High,
      explanations: [
        {
          code: isLowConfidence
            ? RecommendationReason.LowConfidenceExtraction
            : RecommendationReason.HumanReviewRequired,
          metadata: {
            confidence: context.assessment.confidence,
            threshold: this.minConfidenceThreshold,
          },
          message:
            'Human review required due to assessment flag or low confidence.',
        },
      ],
    };
  }
}

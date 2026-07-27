import type { RecommendationRule } from '../recommendation-rule';
import type { RecommendationContext } from '../recommendation-context';
import {
  type RecommendationCandidate,
  RecommendationType,
  RecommendationReason,
  RecommendationSeverity,
} from '../types';
import { CompletionStatus } from '../../policy/completion/completion-decision';

export class ReadyForQuotationRule implements RecommendationRule {
  readonly name = 'ReadyForQuotationRule';
  readonly version = '1.0.0';

  constructor(private readonly minConfidenceThreshold = 70) {}

  applies(context: Readonly<RecommendationContext>): boolean {
    return (
      context.policyReport.completion.status === CompletionStatus.Complete &&
      context.assessment.confidence >= this.minConfidenceThreshold
    );
  }

  evaluate(context: Readonly<RecommendationContext>): RecommendationCandidate {
    return {
      rule: { name: this.name, version: this.version },
      recommendation: RecommendationType.ReadyForQuotation,
      severity: RecommendationSeverity.High,
      explanations: [
        {
          code: RecommendationReason.HighConfidenceReady,
          metadata: {
            confidence: context.assessment.confidence,
          },
          message: 'All required facts collected with high confidence.',
        },
      ],
    };
  }
}

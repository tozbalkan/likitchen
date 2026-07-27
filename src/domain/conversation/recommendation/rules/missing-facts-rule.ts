import type { RecommendationRule } from '../recommendation-rule';
import type { RecommendationContext } from '../recommendation-context';
import {
  type RecommendationCandidate,
  RecommendationType,
  RecommendationReason,
  RecommendationSeverity,
} from '../types';
import { CompletionStatus } from '../../policy/completion/completion-decision';

export class MissingFactsRule implements RecommendationRule {
  readonly name = 'MissingFactsRule';
  readonly version = '1.0.0';

  applies(context: Readonly<RecommendationContext>): boolean {
    return (
      context.policyReport.completion.status ===
      CompletionStatus.MissingRequiredFacts
    );
  }

  evaluate(context: Readonly<RecommendationContext>): RecommendationCandidate {
    const nextFact = context.policyReport.selection.nextFact;
    return {
      rule: { name: this.name, version: this.version },
      recommendation: RecommendationType.AskNextQuestion,
      severity: RecommendationSeverity.Medium,
      explanations: [
        {
          code: RecommendationReason.MissingRequiredInformation,
          metadata: {
            fact: nextFact,
          },
          message: `Missing required information. Recommended next question: ${nextFact ?? 'unknown'}`,
        },
      ],
    };
  }
}

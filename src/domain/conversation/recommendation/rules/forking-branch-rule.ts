import type { RecommendationRule } from '../recommendation-rule';
import type { RecommendationContext } from '../recommendation-context';
import {
  type RecommendationCandidate,
  RecommendationType,
  RecommendationReason,
  RecommendationSeverity,
} from '../types';

export class ForkingBranchRule implements RecommendationRule {
  readonly name = 'ForkingBranchRule';
  readonly version = '1.0.0';

  applies(context: Readonly<RecommendationContext>): boolean {
    return context.policyReport.branching.status === 'fork';
  }

  evaluate(context: Readonly<RecommendationContext>): RecommendationCandidate {
    const targetBranch = context.policyReport.branching.target;
    return {
      rule: { name: this.name, version: this.version },
      recommendation: RecommendationType.ContinueConversation,
      severity: RecommendationSeverity.Medium,
      explanations: [
        {
          code: RecommendationReason.ForkingBranchDetected,
          metadata: {
            targetBranch,
          },
          message: `Branch fork detected targeting ${targetBranch ?? 'unknown'}.`,
        },
      ],
    };
  }
}

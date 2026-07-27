import type { RecommendationRule } from '../recommendation-rule';
import type { RecommendationContext } from '../recommendation-context';
import {
  type RecommendationCandidate,
  RecommendationType,
  RecommendationReason,
  RecommendationSeverity,
} from '../types';

export class TerminalBranchRule implements RecommendationRule {
  readonly name = 'TerminalBranchRule';
  readonly version = '1.0.0';

  applies(context: Readonly<RecommendationContext>): boolean {
    return context.policyReport.branching.status === 'terminal';
  }

  evaluate(_context: Readonly<RecommendationContext>): RecommendationCandidate {
    return {
      rule: { name: this.name, version: this.version },
      recommendation: RecommendationType.Complete,
      severity: RecommendationSeverity.Immediate,
      explanations: [
        {
          code: RecommendationReason.TerminalBranchReached,
          message: 'Policy evaluation reached a terminal branch.',
        },
      ],
    };
  }
}

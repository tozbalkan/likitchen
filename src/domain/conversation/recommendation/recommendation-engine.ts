import type { RecommendationRule } from './recommendation-rule';
import type { RecommendationContext } from './recommendation-context';
import type {
  RecommendationCandidate,
  RecommendationDecision,
  RecommendationEngineMetadata,
} from './types';
import {
  DefaultSelectionStrategy,
  type RecommendationSelectionStrategy,
} from './selection-strategy';

import { CancelledConversationRule } from './rules/cancelled-conversation-rule';
import { TerminalBranchRule } from './rules/terminal-branch-rule';
import { HumanReviewRule } from './rules/human-review-rule';
import { MissingFactsRule } from './rules/missing-facts-rule';
import { ForkingBranchRule } from './rules/forking-branch-rule';
import { ReadyForQuotationRule } from './rules/ready-for-quotation-rule';
import { DefaultRecommendationRule } from './rules/default-recommendation-rule';

export const DEFAULT_RECOMMENDATION_RULES: readonly RecommendationRule[] = [
  new CancelledConversationRule(),
  new TerminalBranchRule(),
  new HumanReviewRule(),
  new MissingFactsRule(),
  new ForkingBranchRule(),
  new ReadyForQuotationRule(),
  new DefaultRecommendationRule(),
];

export class RecommendationEngine {
  readonly metadata: RecommendationEngineMetadata = {
    engineVersion: '1.0.0',
    ruleSetVersion: '1.0.0',
    evaluationVersion: '1.0.0',
  };

  private readonly rules: readonly RecommendationRule[];

  constructor(
    rules?: readonly RecommendationRule[],
    private readonly selectionStrategy: RecommendationSelectionStrategy = new DefaultSelectionStrategy(),
  ) {
    this.rules = rules ?? DEFAULT_RECOMMENDATION_RULES;
  }

  evaluate(context: Readonly<RecommendationContext>): RecommendationDecision {
    const candidates: RecommendationCandidate[] = [];

    for (const rule of this.rules) {
      if (rule.applies(context)) {
        candidates.push(rule.evaluate(context));
      }
    }

    const winningCandidate = this.selectionStrategy.select(candidates);

    return {
      recommendation: winningCandidate.recommendation,
      winningRule: winningCandidate.rule,
      severity: winningCandidate.severity,
      candidates,
      explanations: winningCandidate.explanations,
    };
  }
}

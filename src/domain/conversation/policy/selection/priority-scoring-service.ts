import type { PolicyContext } from '../policy-context';
import type { PolicyExplanation } from '../policy-result';
import type { FactKey } from '../completion/completion-requirements';

export interface FactPriority {
  readonly fact: FactKey;
  readonly score: number;
  readonly reasons: readonly PolicyExplanation[];
}

export interface PriorityRule {
  readonly name: string;
  evaluate(
    fact: FactKey,
    context: Readonly<PolicyContext>,
  ): { score: number; explanation?: PolicyExplanation } | null;
}

export class PriorityScoringService {
  constructor(private readonly rules: readonly PriorityRule[]) {}

  score(fact: FactKey, context: Readonly<PolicyContext>): FactPriority {
    let totalScore = 0;
    const reasons: PolicyExplanation[] = [];

    for (const rule of this.rules) {
      const result = rule.evaluate(fact, context);
      if (result) {
        totalScore += result.score;
        if (result.explanation) {
          reasons.push(result.explanation);
        }
      }
    }

    return {
      fact,
      score: totalScore,
      reasons,
    };
  }
}

import { type RecommendationCandidate, RecommendationSeverity } from './types';

export interface RecommendationSelectionStrategy {
  select(
    candidates: readonly RecommendationCandidate[],
  ): RecommendationCandidate;
}

const SEVERITY_ORDER: Record<RecommendationSeverity, number> = {
  [RecommendationSeverity.Immediate]: 4,
  [RecommendationSeverity.High]: 3,
  [RecommendationSeverity.Medium]: 2,
  [RecommendationSeverity.Low]: 1,
};

export class DefaultSelectionStrategy implements RecommendationSelectionStrategy {
  select(
    candidates: readonly RecommendationCandidate[],
  ): RecommendationCandidate {
    if (candidates.length === 0) {
      throw new Error('Cannot select from empty candidate list');
    }

    let winner = candidates[0]!;

    for (let i = 1; i < candidates.length; i++) {
      const candidate = candidates[i]!;
      const currentScore = SEVERITY_ORDER[winner.severity];
      const newScore = SEVERITY_ORDER[candidate.severity];

      if (newScore > currentScore) {
        winner = candidate;
      }
    }

    return winner;
  }
}

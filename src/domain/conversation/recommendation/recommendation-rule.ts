import type { RecommendationContext } from './recommendation-context';
import type { RecommendationCandidate } from './types';

export interface RecommendationRule {
  readonly name: string;
  readonly version: string;
  applies(context: Readonly<RecommendationContext>): boolean;
  evaluate(context: Readonly<RecommendationContext>): RecommendationCandidate;
}

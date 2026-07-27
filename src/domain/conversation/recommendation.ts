import { ServiceAreaStatuses, type ServiceAreaStatus } from './location';
import { READINESS_THRESHOLD_ROUTE_TO_HUMAN } from './readiness-policy';
import { CONFIDENCE_THRESHOLD_MINIMUM } from './confidence-policy';

export type RecommendationEnum =
  'ask_followup' | 'route_to_human' | 'low_priority' | 'out_of_service_area';

import type { Instant } from '../../shared/types';

export interface RecommendationInput {
  readiness: number | null;
  confidence: number;
  locationStatus: ServiceAreaStatus;
  missingRequiredFields: boolean;
}

export type ConversationAssessment = Readonly<{
  readiness: number;
  confidence: number;
  recommendation: RecommendationEnum;
  reasons: readonly string[];
  calculatedAt: Instant;
}>;

export interface RecommendationDecision {
  recommendation: RecommendationEnum;
  reasons: string[];
}

/**
 * Pure decision engine that maps an assessment to a recommendation.
 */
export function recommend(input: RecommendationInput): RecommendationDecision {
  const reasons: string[] = [];

  if (input.missingRequiredFields) {
    reasons.push('Missing required qualification facts.');
    return { recommendation: 'ask_followup', reasons };
  }

  if (input.locationStatus === ServiceAreaStatuses.Unresolved) {
    reasons.push('Location needs to be resolved.');
    return { recommendation: 'ask_followup', reasons };
  }

  if (input.locationStatus === ServiceAreaStatuses.Unsupported) {
    reasons.push('Location is outside of our service area.');
    return { recommendation: 'out_of_service_area', reasons };
  }

  if (input.confidence < CONFIDENCE_THRESHOLD_MINIMUM) {
    reasons.push(
      `Confidence (${input.confidence}) is below threshold (${CONFIDENCE_THRESHOLD_MINIMUM}).`,
    );
    return { recommendation: 'ask_followup', reasons };
  }

  if (
    input.readiness !== null &&
    input.readiness >= READINESS_THRESHOLD_ROUTE_TO_HUMAN
  ) {
    reasons.push(
      `Readiness (${input.readiness}) meets or exceeds threshold (${READINESS_THRESHOLD_ROUTE_TO_HUMAN}).`,
    );
    return { recommendation: 'route_to_human', reasons };
  }

  reasons.push(`Readiness (${input.readiness}) is below routing threshold.`);
  return { recommendation: 'low_priority', reasons };
}

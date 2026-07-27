import type { ExtractedFacts, ConversationFacts } from './conversation-facts';
import { READINESS_WEIGHTS } from './readiness-policy';
import { CONFIDENCE_RULES } from './confidence-policy';
import { ServiceAreaStatuses } from './location';

export function calculateConfidence(facts: ExtractedFacts): number {
  let filledCount = 0;

  for (const field of CONFIDENCE_RULES) {
    const value = (facts as unknown as Record<string, unknown>)[
      field as string
    ];
    if (Array.isArray(value)) {
      if (value.length > 0) filledCount++;
    } else if (value !== undefined && value !== null && value !== '') {
      filledCount++;
    }
  }

  return Math.round((filledCount / CONFIDENCE_RULES.length) * 100);
}

export function calculateReadiness(facts: ConversationFacts): number | null {
  // If service area is strictly unsupported, readiness is N/A
  if (facts.service_area_status === ServiceAreaStatuses.Unsupported) {
    return null;
  }

  let score = 0;

  // The policy execution is strictly data-driven based on READINESS_WEIGHTS.
  // The logic maps facts to the policy weights without hardcoding magic numbers.

  if (facts.project_type === 'full_kitchen_remodel') {
    score += READINESS_WEIGHTS.full_kitchen_remodel_bonus;
  }

  if (facts.budget_range && facts.budget_range !== 'not_sure') {
    score += READINESS_WEIGHTS.budget_mentioned;
  }

  if (facts.attachments && facts.attachments.length > 0) {
    score += READINESS_WEIGHTS.has_photos;
  }

  if (facts.timeline && facts.timeline !== 'unsure') {
    score += READINESS_WEIGHTS.timeline_defined;
  }

  if (facts.is_homeowner) {
    score += READINESS_WEIGHTS.is_homeowner;
  }

  return score;
}

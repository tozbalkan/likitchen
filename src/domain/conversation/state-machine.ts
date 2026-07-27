import type { ExtractedFacts } from './conversation-facts';
import {
  hasProjectType,
  hasLocation,
  hasBudget,
  hasTimeline,
  hasPhotos,
  type Predicate,
} from './predicates';

export const STAGES = [
  'greeting',
  'project_type',
  'location',
  'budget',
  'timeline',
  'photos',
  'summary',
  'done',
] as const;

export type Stage = (typeof STAGES)[number];

type TransitionRule = [Predicate, Stage];

// The table evaluates from top to bottom.
// If the predicate returns false (i.e. the fact is missing), it returns the Stage to ask for it.
const transitions: TransitionRule[] = [
  [hasProjectType, 'project_type'],
  [hasLocation, 'location'],
  [hasBudget, 'budget'],
  [hasTimeline, 'timeline'],
  [hasPhotos, 'photos'],
];

/**
 * Deterministically determines the next stage based on extracted facts.
 */
export function nextStage(facts: ExtractedFacts): Stage {
  for (const [predicate, stage] of transitions) {
    if (!predicate(facts)) {
      return stage;
    }
  }
  return 'summary';
}

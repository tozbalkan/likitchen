import type { ExtractedFacts } from './conversation-facts';

export type Predicate = (facts: ExtractedFacts) => boolean;

export const hasProjectType: Predicate = (facts) => Boolean(facts.project_type);
export const hasLocation: Predicate = (facts) => Boolean(facts.location_raw);
export const hasBudget: Predicate = (facts) => Boolean(facts.budget_range);
export const hasTimeline: Predicate = (facts) => Boolean(facts.timeline);
export const hasPhotos: Predicate = (facts) =>
  facts.attachments && facts.attachments.length > 0;

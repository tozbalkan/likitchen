import type { ExtractedFacts } from './conversation-facts';

export const CONFIDENCE_RULES: (keyof ExtractedFacts)[] = [
  'project_type',
  'location_raw',
  'budget_range',
  'timeline',
  'attachments',
  'is_homeowner',
] as const;

export const CONFIDENCE_THRESHOLD_MINIMUM = 50 as const;

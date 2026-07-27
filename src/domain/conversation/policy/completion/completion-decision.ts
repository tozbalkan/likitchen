import type { FactRequirement } from './completion-requirements';

export enum CompletionStatus {
  Complete = 'Complete',
  MissingRequiredFacts = 'MissingRequiredFacts',
  UserCancelled = 'UserCancelled',
  HumanHandoff = 'HumanHandoff',
}

export interface CompletionDecision {
  readonly status: CompletionStatus;
  readonly missingFacts: readonly FactRequirement[];
}

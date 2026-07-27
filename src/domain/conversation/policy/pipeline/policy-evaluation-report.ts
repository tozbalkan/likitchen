import type { CompletionDecision } from '../completion/completion-decision';
import type { QuestionSelectionDecision } from '../selection/question-selection-policy';
import type { BranchDecision } from '../branching/branching-policy';
import type { PolicyExplanation } from '../policy-result';

export interface PolicyEvaluationReport {
  readonly completion: CompletionDecision;
  readonly selection: QuestionSelectionDecision;
  readonly branching: BranchDecision;
  readonly explanations: readonly PolicyExplanation[];
  readonly evaluatedPolicies: readonly string[];
  readonly policyVersions: ReadonlyMap<string, string>;
}

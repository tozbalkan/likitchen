import type { PolicyContext } from '../policy-context';
import type { PolicyEvaluationReport } from './policy-evaluation-report';
import type { ConversationPolicy } from '../conversation-policy';
import type { PolicyResult, PolicyExplanation } from '../policy-result';
import type { Result } from '../../../../shared/result';
import { ok, err } from '../../../../shared/result';
import type { PolicyError } from '../policy-error';

import type { CompletionDecision } from '../completion/completion-decision';
import type { QuestionSelectionDecision } from '../selection/question-selection-policy';
import type { BranchDecision } from '../branching/branching-policy';

export class ConversationPolicyPipeline {
  constructor(
    private readonly completionPolicy: ConversationPolicy<
      PolicyContext,
      PolicyResult<CompletionDecision>
    >,
    private readonly selectionPolicy: ConversationPolicy<
      PolicyContext,
      PolicyResult<QuestionSelectionDecision>
    >,
    private readonly branchingPolicy: ConversationPolicy<
      PolicyContext,
      PolicyResult<BranchDecision>
    >,
  ) {}

  evaluate(
    context: Readonly<PolicyContext>,
  ): Result<PolicyEvaluationReport, PolicyError> {
    const explanations: PolicyExplanation[] = [];
    const evaluatedPolicies: string[] = [];
    const policyVersions = new Map<string, string>();

    // 1. Evaluate Completion Policy
    const completionResult = this.completionPolicy.evaluate(context);
    if (!completionResult.ok) return err(completionResult.error);

    evaluatedPolicies.push(this.completionPolicy.name);
    policyVersions.set(
      this.completionPolicy.name,
      completionResult.value.policyVersion,
    );
    explanations.push(...completionResult.value.explanations);

    // 2. Evaluate Question Selection Policy
    const selectionResult = this.selectionPolicy.evaluate(context);
    if (!selectionResult.ok) return err(selectionResult.error);

    evaluatedPolicies.push(this.selectionPolicy.name);
    policyVersions.set(
      this.selectionPolicy.name,
      selectionResult.value.policyVersion,
    );
    explanations.push(...selectionResult.value.explanations);

    // 3. Evaluate Branching Policy
    const branchingResult = this.branchingPolicy.evaluate(context);
    if (!branchingResult.ok) return err(branchingResult.error);

    evaluatedPolicies.push(this.branchingPolicy.name);
    policyVersions.set(
      this.branchingPolicy.name,
      branchingResult.value.policyVersion,
    );
    explanations.push(...branchingResult.value.explanations);

    // Return the aggregated report
    return ok({
      completion: completionResult.value.decision,
      selection: selectionResult.value.decision,
      branching: branchingResult.value.decision,
      explanations,
      evaluatedPolicies,
      policyVersions,
    });
  }
}

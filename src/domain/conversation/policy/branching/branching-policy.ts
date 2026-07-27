import type { ConversationPolicy } from '../conversation-policy';
import type { PolicyContext } from '../policy-context';
import type { PolicyResult, PolicyExplanation } from '../policy-result';
import type { Result } from '../../../../shared/result';
import { ok } from '../../../../shared/result';
import type { PolicyError } from '../policy-error';

export type ConversationBranch =
  'commercial_kitchen' | 'standard_kitchen' | 'design_only';

export interface BranchDecision {
  readonly status: 'continue' | 'fork' | 'terminal';
  readonly target?: ConversationBranch;
  readonly explanations: readonly PolicyExplanation[];
}

export interface BranchRule {
  readonly name: string;
  evaluate(context: Readonly<PolicyContext>): BranchDecision | null;
}

export class BranchingPolicy implements ConversationPolicy<
  PolicyContext,
  PolicyResult<BranchDecision>
> {
  public readonly name = 'BranchingPolicy';
  public readonly version = '1.0.0';

  constructor(private readonly rules: readonly BranchRule[]) {}

  evaluate(
    context: Readonly<PolicyContext>,
  ): Result<PolicyResult<BranchDecision>, PolicyError> {
    const explanations: PolicyExplanation[] = [];

    for (const rule of this.rules) {
      const decision = rule.evaluate(context);
      if (decision) {
        explanations.push(...decision.explanations);
        return ok({
          decision,
          explanations,
          policyVersion: this.version,
        });
      }
    }

    // Default if no branch rule matched
    explanations.push({ code: 'DefaultBranchSelected' });
    return ok({
      decision: {
        status: 'continue',
        explanations,
      },
      explanations,
      policyVersion: this.version,
    });
  }
}

import type { ConversationPolicy } from '../conversation-policy';
import type { PolicyContext } from '../policy-context';
import type { PolicyResult, PolicyExplanation } from '../policy-result';
import type { Result } from '../../../../shared/result';
import { ok } from '../../../../shared/result';
import type { PolicyError } from '../policy-error';
import type {
  CompletionRequirements,
  FactRequirement,
} from './completion-requirements';
import { CompletionDecision, CompletionStatus } from './completion-decision';

export class CompletionPolicy implements ConversationPolicy<
  PolicyContext,
  PolicyResult<CompletionDecision>
> {
  public readonly name = 'CompletionPolicy';
  public readonly version = '1.0.0';

  constructor(private readonly config: CompletionRequirements) {}

  evaluate(
    context: Readonly<PolicyContext>,
  ): Result<PolicyResult<CompletionDecision>, PolicyError> {
    const explanations: PolicyExplanation[] = [];

    if (context.assessment.recommendation === 'route_to_human') {
      explanations.push({
        code: 'HumanHandoffRequested',
        message: 'User explicitly requested human assistance.',
      });
      return ok({
        decision: { status: CompletionStatus.HumanHandoff, missingFacts: [] },
        explanations,
        policyVersion: this.version,
      });
    }

    const missing: FactRequirement[] = [];
    for (const req of this.config.requiredFacts) {
      if (
        context.facts[req.field] === undefined ||
        context.facts[req.field] === null
      ) {
        missing.push(req);
      }
    }

    if (missing.length > 0) {
      explanations.push({ code: 'MissingMandatoryFacts' });
      return ok({
        decision: {
          status: CompletionStatus.MissingRequiredFacts,
          missingFacts: missing,
        },
        explanations,
        policyVersion: this.version,
      });
    }

    explanations.push({ code: 'AllRequirementsMet' });
    return ok({
      decision: { status: CompletionStatus.Complete, missingFacts: [] },
      explanations,
      policyVersion: this.version,
    });
  }
}

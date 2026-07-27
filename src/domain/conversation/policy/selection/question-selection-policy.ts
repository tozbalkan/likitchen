import type { ConversationPolicy } from '../conversation-policy';
import type { PolicyContext } from '../policy-context';
import type { PolicyResult, PolicyExplanation } from '../policy-result';
import type { Result } from '../../../../shared/result';
import { ok } from '../../../../shared/result';
import type { PolicyError } from '../policy-error';
import type {
  FactPriority,
  PriorityScoringService,
} from './priority-scoring-service';
import type { FactKey } from '../completion/completion-requirements';

export interface QuestionSelectionDecision {
  readonly nextFact?: FactKey;
  readonly candidates: readonly FactPriority[];
  readonly reason: 'NoMissingFacts' | 'NextQuestionSelected';
  readonly confidence: number;
}

export class QuestionSelectionPolicy implements ConversationPolicy<
  PolicyContext,
  PolicyResult<QuestionSelectionDecision>
> {
  public readonly name = 'QuestionSelectionPolicy';
  public readonly version = '1.0.0';

  constructor(
    private readonly missingFactCandidates: readonly FactKey[],
    private readonly scoringService: PriorityScoringService,
  ) {}

  evaluate(
    context: Readonly<PolicyContext>,
  ): Result<PolicyResult<QuestionSelectionDecision>, PolicyError> {
    const explanations: PolicyExplanation[] = [];
    const candidates: FactPriority[] = [];

    // Find facts that are currently missing
    for (const fact of this.missingFactCandidates) {
      if (context.facts[fact] === undefined || context.facts[fact] === null) {
        candidates.push(this.scoringService.score(fact, context));
      }
    }

    if (candidates.length === 0) {
      explanations.push({ code: 'NoMissingFactsFound' });
      return ok({
        decision: {
          candidates: [],
          reason: 'NoMissingFacts',
          confidence: 100,
        },
        explanations,
        policyVersion: this.version,
      });
    }

    // Sort candidates by score descending
    candidates.sort((a, b) => b.score - a.score);
    const bestCandidate = candidates[0];

    explanations.push({ code: 'NextQuestionSelected' });
    return ok({
      decision: {
        nextFact: bestCandidate!.fact,
        candidates,
        reason: 'NextQuestionSelected',
        confidence: 100, // This could be calculated based on score margin
      },
      explanations,
      policyVersion: this.version,
    });
  }
}

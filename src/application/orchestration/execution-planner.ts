import type { RecommendationDecision } from '../../domain/conversation/recommendation/types';
import { RecommendationType } from '../../domain/conversation/recommendation/types';
import type { FactKey } from '../../domain/conversation/policy/completion/completion-requirements';
import type { ActionPlan, ApplicationAction } from './types';

export class ExecutionPlanner {
  createPlan(decision: Readonly<RecommendationDecision>): ActionPlan {
    const actions: ApplicationAction[] = [];

    switch (decision.recommendation) {
      case RecommendationType.AskNextQuestion: {
        const nextFactMeta = decision.explanations.find((e) => e.metadata?.fact)
          ?.metadata?.fact;
        const factKey =
          typeof nextFactMeta === 'string'
            ? (nextFactMeta as FactKey)
            : 'project_type';

        actions.push({
          type: 'SendQuestion',
          fact: factKey,
        });
        break;
      }

      case RecommendationType.ReadyForQuotation:
        actions.push({
          type: 'ReadyForQuotation',
        });
        break;

      case RecommendationType.HumanHandoff:
        actions.push({
          type: 'HumanHandoff',
          reason: decision.explanations[0]?.message ?? 'Human review requested',
        });
        break;

      case RecommendationType.Complete:
        actions.push({
          type: 'CompleteConversation',
        });
        break;

      case RecommendationType.RejectConversation:
        actions.push({
          type: 'RejectConversation',
          reason: decision.explanations[0]?.message ?? 'Conversation rejected',
        });
        break;

      case RecommendationType.ContinueConversation:
      default:
        // Continues conversation without triggering immediate special actions
        break;
    }

    return {
      decision,
      actions,
    };
  }
}

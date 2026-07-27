import { describe, it, expect } from 'vitest';
import {
  PriorityScoringService,
  type PriorityRule,
} from './priority-scoring-service';
import type { PolicyContext } from '../policy-context';
import type { ConversationState } from '../../index';
import type { ConversationFacts } from '../../conversation-facts';

describe('PriorityScoringService', () => {
  const dummyContext: PolicyContext = {
    state: {} as unknown as ConversationState,
    facts: {} as unknown as ConversationFacts,
    assessment: {
      confidence: 100,
      readiness: 100,
      recommendation: 'ask_followup',
      reasons: [],
      calculatedAt: new Date(),
    },
  };

  it('should accumulate scores from matching rules', () => {
    const rules: PriorityRule[] = [
      {
        name: 'BaseProjectScore',
        evaluate: (fact) => {
          if (fact === 'project_type')
            return { score: 100, explanation: { code: 'HighPriorityProject' } };
          return null;
        },
      },
      {
        name: 'UrgentTimeline',
        evaluate: (fact, context) => {
          if (
            fact === 'timeline' &&
            context.facts.project_type === 'cabinets_only'
          )
            return { score: 50 };
          return null;
        },
      },
    ];

    const service = new PriorityScoringService(rules);
    const result = service.score('project_type', dummyContext);

    expect(result.fact).toBe('project_type');
    expect(result.score).toBe(100);
    expect(result.reasons.length).toBe(1);
    expect(result.reasons[0]?.code).toBe('HighPriorityProject');
  });
});

import { describe, it, expect } from 'vitest';
import { QuestionSelectionPolicy } from './question-selection-policy';
import {
  PriorityScoringService,
  type PriorityRule,
} from './priority-scoring-service';
import type { PolicyContext } from '../policy-context';
import type { ConversationState } from '../../index';
import type { ConversationFacts } from '../../conversation-facts';

describe('QuestionSelectionPolicy', () => {
  const rules: PriorityRule[] = [
    {
      name: 'ProjectPriority',
      evaluate: (fact) => (fact === 'project_type' ? { score: 100 } : null),
    },
    {
      name: 'BudgetPriority',
      evaluate: (fact) => (fact === 'budget_range' ? { score: 50 } : null),
    },
  ];

  const scoringService = new PriorityScoringService(rules);
  const policy = new QuestionSelectionPolicy(
    ['project_type', 'budget_range'],
    scoringService,
  );

  const baseContext: PolicyContext = {
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

  it('should select the highest scoring missing fact', () => {
    // Both missing, project_type scores 100, budget_range scores 50
    const result = policy.evaluate(baseContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.decision.nextFact).toBe('project_type');
      expect(result.value.decision.reason).toBe('NextQuestionSelected');
      expect(result.value.decision.candidates.length).toBe(2);
      expect(result.value.decision.candidates[0]?.fact).toBe('project_type');
    }
  });

  it('should return NoMissingFacts if all candidates are present', () => {
    const completeContext: PolicyContext = {
      ...baseContext,
      facts: {
        project_type: 'full_kitchen_remodel',
        budget_range: '15k_30k',
      } as unknown as ConversationFacts,
    };
    const result = policy.evaluate(completeContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.decision.nextFact).toBeUndefined();
      expect(result.value.decision.reason).toBe('NoMissingFacts');
      expect(result.value.decision.candidates.length).toBe(0);
    }
  });
});

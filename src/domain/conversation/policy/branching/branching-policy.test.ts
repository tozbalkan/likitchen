import { describe, it, expect } from 'vitest';
import { BranchingPolicy, type BranchRule } from './branching-policy';
import type { PolicyContext } from '../policy-context';
import type { ConversationState } from '../../index';
import type { ConversationFacts } from '../../conversation-facts';

describe('BranchingPolicy', () => {
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

  it('should return the first matching branch decision', () => {
    const rules: BranchRule[] = [
      {
        name: 'CommercialFork',
        evaluate: (context) => {
          if (context.facts.project_type === 'other') {
            return {
              status: 'fork',
              target: 'commercial_kitchen',
              explanations: [{ code: 'CommercialProjectDetected' }],
            };
          }
          return null;
        },
      },
    ];

    const policy = new BranchingPolicy(rules);
    const commercialContext: PolicyContext = {
      ...dummyContext,
      facts: { project_type: 'other' } as unknown as ConversationFacts,
    };

    const result = policy.evaluate(commercialContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.decision.status).toBe('fork');
      expect(result.value.decision.target).toBe('commercial_kitchen');
      expect(result.value.explanations.length).toBe(1);
      expect(result.value.explanations[0]?.code).toBe(
        'CommercialProjectDetected',
      );
    }
  });

  it('should return continue if no rules match', () => {
    const policy = new BranchingPolicy([]);
    const result = policy.evaluate(dummyContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.decision.status).toBe('continue');
      expect(result.value.decision.target).toBeUndefined();
      expect(result.value.explanations[0]?.code).toBe('DefaultBranchSelected');
    }
  });
});

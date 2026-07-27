import { describe, it, expect } from 'vitest';
import { CompletionPolicy } from './completion-policy';
import type { CompletionRequirements } from './completion-requirements';
import { CompletionStatus } from './completion-decision';
import type { PolicyContext } from '../policy-context';

describe('Completion Policy', () => {
  const config: CompletionRequirements = {
    requiredFacts: [
      { field: 'project_type', reason: 'Need to know what project to build' },
      { field: 'budget_range', reason: 'Need budget to assess feasibility' },
    ],
  };

  const policy = new CompletionPolicy(config);

  const baseContext: PolicyContext = {
    state: {} as never,
    facts: { schema_version: 1, attachments: [] },
    assessment: {
      confidence: 100,
      readiness: 100,
      recommendation: 'ask_followup',
      reasons: [],
      calculatedAt: new Date(),
    },
  };

  it('should return MissingRequiredFacts when facts are missing', () => {
    const result = policy.evaluate(baseContext);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.decision.status).toBe(
        CompletionStatus.MissingRequiredFacts,
      );
      expect(result.value.decision.missingFacts.length).toBe(2);
      expect(result.value.explanations[0]!.code).toBe('MissingMandatoryFacts');
    }
  });

  it('should return Complete when all facts are present', () => {
    const completeContext: PolicyContext = {
      ...baseContext,
      facts: {
        ...baseContext.facts,
        project_type: 'full_kitchen_remodel',
        budget_range: '15k_30k',
      },
    };
    const result = policy.evaluate(completeContext);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.decision.status).toBe(CompletionStatus.Complete);
      expect(result.value.decision.missingFacts.length).toBe(0);
      expect(result.value.explanations[0]!.code).toBe('AllRequirementsMet');
    }
  });

  it('should return HumanHandoff when assessment recommends it, even if facts missing', () => {
    const handoffContext: PolicyContext = {
      ...baseContext,
      assessment: {
        ...baseContext.assessment,
        recommendation: 'route_to_human',
      },
    };
    const result = policy.evaluate(handoffContext);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.decision.status).toBe(CompletionStatus.HumanHandoff);
      expect(result.value.decision.missingFacts.length).toBe(0);
      expect(result.value.explanations[0]!.code).toBe('HumanHandoffRequested');
    }
  });
});

import { describe, it, expect } from 'vitest';
import { ExecutionPlanner } from './execution-planner';
import {
  RecommendationType,
  RecommendationReason,
  RecommendationSeverity,
} from '../../domain/conversation/recommendation/types';

describe('ExecutionPlanner', () => {
  const planner = new ExecutionPlanner();

  it('should map AskNextQuestion recommendation to SendQuestion action with fact metadata', () => {
    const decision = {
      recommendation: RecommendationType.AskNextQuestion,
      winningRule: { name: 'MissingFactsRule', version: '1.0.0' },
      severity: RecommendationSeverity.Medium,
      candidates: [],
      explanations: [
        {
          code: RecommendationReason.MissingRequiredInformation,
          metadata: { fact: 'budget_range' },
        },
      ],
    };

    const plan = planner.createPlan(decision);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toEqual({
      type: 'SendQuestion',
      fact: 'budget_range',
    });
  });

  it('should map ReadyForQuotation recommendation to ReadyForQuotation action', () => {
    const decision = {
      recommendation: RecommendationType.ReadyForQuotation,
      winningRule: { name: 'ReadyForQuotationRule', version: '1.0.0' },
      severity: RecommendationSeverity.High,
      candidates: [],
      explanations: [],
    };

    const plan = planner.createPlan(decision);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toEqual({
      type: 'ReadyForQuotation',
    });
  });

  it('should map HumanHandoff recommendation to HumanHandoff action with reason', () => {
    const decision = {
      recommendation: RecommendationType.HumanHandoff,
      winningRule: { name: 'HumanReviewRule', version: '1.0.0' },
      severity: RecommendationSeverity.High,
      candidates: [],
      explanations: [
        {
          code: RecommendationReason.LowConfidenceExtraction,
          message: 'Confidence is below threshold',
        },
      ],
    };

    const plan = planner.createPlan(decision);

    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toEqual({
      type: 'HumanHandoff',
      reason: 'Confidence is below threshold',
    });
  });
});

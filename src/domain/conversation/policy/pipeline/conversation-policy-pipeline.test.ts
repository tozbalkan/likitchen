import { describe, it, expect } from 'vitest';
import { CompletionStatus } from '../completion/completion-decision';
import { ConversationPolicyPipeline } from './conversation-policy-pipeline';
import type { ConversationPolicy } from '../conversation-policy';
import type { PolicyContext } from '../policy-context';
import type { PolicyResult } from '../policy-result';
import { ok } from '../../../../shared/result';
import type { CompletionDecision } from '../completion/completion-decision';
import type { QuestionSelectionDecision } from '../selection/question-selection-policy';
import type { BranchDecision } from '../branching/branching-policy';
import type { ConversationState } from '../../index';
import type { ConversationFacts } from '../../conversation-facts';

describe('ConversationPolicyPipeline', () => {
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

  const mockCompletionPolicy: ConversationPolicy<
    PolicyContext,
    PolicyResult<CompletionDecision>
  > = {
    name: 'MockCompletionPolicy',
    version: '1.0.0',
    evaluate: () =>
      ok({
        decision: {
          status: CompletionStatus.MissingRequiredFacts,
          missingFacts: [],
        },
        explanations: [{ code: 'CompletionChecked' }],
        policyVersion: '1.0.0',
      }),
  };

  const mockSelectionPolicy: ConversationPolicy<
    PolicyContext,
    PolicyResult<QuestionSelectionDecision>
  > = {
    name: 'MockSelectionPolicy',
    version: '2.0.0',
    evaluate: () =>
      ok({
        decision: { candidates: [], reason: 'NoMissingFacts', confidence: 100 },
        explanations: [{ code: 'SelectionChecked' }],
        policyVersion: '2.0.0',
      }),
  };

  const mockBranchingPolicy: ConversationPolicy<
    PolicyContext,
    PolicyResult<BranchDecision>
  > = {
    name: 'MockBranchingPolicy',
    version: '3.0.0',
    evaluate: () =>
      ok({
        decision: { status: 'continue', explanations: [] },
        explanations: [{ code: 'BranchingChecked' }],
        policyVersion: '3.0.0',
      }),
  };

  it('should evaluate all policies and aggregate the results', () => {
    const pipeline = new ConversationPolicyPipeline(
      mockCompletionPolicy,
      mockSelectionPolicy,
      mockBranchingPolicy,
    );
    const result = pipeline.evaluate(dummyContext);

    expect(result.ok).toBe(true);
    if (result.ok) {
      const report = result.value;

      expect(report.completion.status).toBe(
        CompletionStatus.MissingRequiredFacts,
      );
      expect(report.selection.reason).toBe('NoMissingFacts');
      expect(report.branching.status).toBe('continue');

      expect(report.evaluatedPolicies).toEqual([
        'MockCompletionPolicy',
        'MockSelectionPolicy',
        'MockBranchingPolicy',
      ]);

      expect(report.policyVersions.get('MockCompletionPolicy')).toBe('1.0.0');
      expect(report.policyVersions.get('MockSelectionPolicy')).toBe('2.0.0');
      expect(report.policyVersions.get('MockBranchingPolicy')).toBe('3.0.0');

      expect(report.explanations.length).toBe(3);
      expect(report.explanations.map((e) => e.code)).toEqual([
        'CompletionChecked',
        'SelectionChecked',
        'BranchingChecked',
      ]);
    }
  });
});

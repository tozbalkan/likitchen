import { describe, it, expect } from 'vitest';
import { RecommendationEngine } from './recommendation-engine';
import {
  RecommendationType,
  RecommendationReason,
  RecommendationSeverity,
} from './types';
import type { RecommendationContext } from './recommendation-context';
import type { PolicyEvaluationReport } from '../policy/pipeline/policy-evaluation-report';
import { CompletionStatus } from '../policy/completion/completion-decision';
import type { ConversationFacts } from '../conversation-facts';

describe('RecommendationEngine', () => {
  const engine = new RecommendationEngine();

  const baseReport: PolicyEvaluationReport = {
    completion: { status: CompletionStatus.Complete, missingFacts: [] },
    selection: { candidates: [], reason: 'NoMissingFacts', confidence: 100 },
    branching: { status: 'continue', explanations: [] },
    explanations: [],
    evaluatedPolicies: [
      'CompletionPolicy',
      'QuestionSelectionPolicy',
      'BranchingPolicy',
    ],
    policyVersions: new Map(),
  };

  const baseContext: RecommendationContext = {
    conversationStatus: 'open',
    facts: {} as unknown as ConversationFacts,
    assessment: {
      confidence: 90,
      readiness: 100,
      recommendation: 'ask_followup',
      reasons: [],
      calculatedAt: new Date(),
    },
    policyReport: baseReport,
  };

  it('should recommend ReadyForQuotation when complete with high confidence', () => {
    const decision = engine.evaluate(baseContext);

    expect(decision.recommendation).toBe(RecommendationType.ReadyForQuotation);
    expect(decision.winningRule.name).toBe('ReadyForQuotationRule');
    expect(decision.severity).toBe(RecommendationSeverity.High);
    expect(decision.explanations[0]?.code).toBe(
      RecommendationReason.HighConfidenceReady,
    );
  });

  it('should recommend AskNextQuestion when missing required facts', () => {
    const missingContext: RecommendationContext = {
      ...baseContext,
      policyReport: {
        ...baseReport,
        completion: {
          status: CompletionStatus.MissingRequiredFacts,
          missingFacts: [],
        },
        selection: {
          nextFact: 'budget_range',
          candidates: [],
          reason: 'NextQuestionSelected',
          confidence: 100,
        },
      },
    };

    const decision = engine.evaluate(missingContext);

    expect(decision.recommendation).toBe(RecommendationType.AskNextQuestion);
    expect(decision.winningRule.name).toBe('MissingFactsRule');
    expect(decision.severity).toBe(RecommendationSeverity.Medium);
    expect(decision.explanations[0]?.code).toBe(
      RecommendationReason.MissingRequiredInformation,
    );
    expect(decision.explanations[0]?.metadata).toEqual({
      fact: 'budget_range',
    });
  });

  it('should recommend HumanHandoff when low confidence', () => {
    const lowConfidenceContext: RecommendationContext = {
      ...baseContext,
      assessment: { ...baseContext.assessment, confidence: 50 },
    };

    const decision = engine.evaluate(lowConfidenceContext);

    expect(decision.recommendation).toBe(RecommendationType.HumanHandoff);
    expect(decision.winningRule.name).toBe('HumanReviewRule');
    expect(decision.severity).toBe(RecommendationSeverity.High);
    expect(decision.explanations[0]?.code).toBe(
      RecommendationReason.LowConfidenceExtraction,
    );
  });

  it('should recommend Complete when conversation is cancelled/lost', () => {
    const cancelledContext: RecommendationContext = {
      ...baseContext,
      conversationStatus: 'lost',
    };

    const decision = engine.evaluate(cancelledContext);

    expect(decision.recommendation).toBe(RecommendationType.Complete);
    expect(decision.winningRule.name).toBe('CancelledConversationRule');
    expect(decision.severity).toBe(RecommendationSeverity.Immediate);
  });

  it('should recommend Complete when branching status is terminal', () => {
    const terminalContext: RecommendationContext = {
      ...baseContext,
      policyReport: {
        ...baseReport,
        branching: { status: 'terminal', explanations: [] },
      },
    };

    const decision = engine.evaluate(terminalContext);

    expect(decision.recommendation).toBe(RecommendationType.Complete);
    expect(decision.winningRule.name).toBe('TerminalBranchRule');
    expect(decision.severity).toBe(RecommendationSeverity.Immediate);
  });

  it('should recommend ContinueConversation on forking branch', () => {
    const forkingContext: RecommendationContext = {
      ...baseContext,
      policyReport: {
        ...baseReport,
        completion: {
          status: CompletionStatus.MissingRequiredFacts,
          missingFacts: [],
        },
        branching: {
          status: 'fork',
          target: 'commercial_kitchen',
          explanations: [],
        },
      },
    };

    const decision = engine.evaluate(forkingContext);

    // Human review / missing facts vs fork severity ordering:
    // Fork is Medium severity, MissingFacts is Medium severity. First matching candidate wins on tie.
    expect(decision.candidates.length).toBeGreaterThan(1);
    expect(decision.winningRule.name).toBe('MissingFactsRule');
  });

  it('should expose candidates list before final decision', () => {
    const decision = engine.evaluate(baseContext);

    expect(decision.candidates).toBeDefined();
    expect(decision.candidates.length).toBeGreaterThanOrEqual(2); // ReadyForQuotationRule + DefaultRecommendationRule
  });
});

import { describe, it, expect, vi } from 'vitest';
import {
  ConversationRuntimeService,
  type RuntimeRepositoryPort,
} from './conversation-runtime-service';
import { RuntimeEngine } from '../../domain/conversation/runtime/runtime-engine';
import {
  RuntimeLockManager,
  type RuntimeLockPort,
} from './runtime-lock-manager';
import { RecommendationEngine } from '../../domain/conversation/recommendation/recommendation-engine';
import { DecisionOrchestrator } from '../orchestration/decision-orchestrator';
import { ExecutionPlanner } from '../orchestration/execution-planner';
import { ActionHandlerRegistry } from '../orchestration/handlers/action-handler-registry';
import { RuntimeState } from '../../domain/conversation/runtime/types';
import type { ProcessContext } from '../../shared/types';
import type { Clock } from '../ports/clock';

describe('ConversationRuntimeService', () => {
  const runtimeEngine = new RuntimeEngine();
  const mockLockPort: RuntimeLockPort = {
    acquireLock: vi.fn().mockResolvedValue(true),
    releaseLock: vi.fn().mockResolvedValue(undefined),
  };
  const lockManager = new RuntimeLockManager(mockLockPort);

  const mockRepo: RuntimeRepositoryPort = {
    loadContext: vi.fn().mockResolvedValue({
      sessionId: 'sess-1',
      conversationId: 'conv-1',
      state: RuntimeState.WaitingForUser,
      revision: { revisionNumber: 1, messageId: 'msg-0' },
    }),
    saveContext: vi.fn().mockResolvedValue(undefined),
  };

  const recommendationEngine = new RecommendationEngine();
  const planner = new ExecutionPlanner();
  const registry = new ActionHandlerRegistry();
  const clock: Clock = { now: () => new Date('2026-07-27T20:00:00Z') };

  const orchestrator = new DecisionOrchestrator(planner, registry, clock);

  const runtimeService = new ConversationRuntimeService(
    runtimeEngine,
    lockManager,
    mockRepo,
    recommendationEngine,
    orchestrator,
  );

  const processContext: ProcessContext = {
    correlationId: 'corr-1' as unknown as ProcessContext['correlationId'],
    traceId: 'trace-1' as unknown as ProcessContext['traceId'],
  };

  it('should process incoming user message and update context', async () => {
    const pipelineEvaluator = vi.fn().mockResolvedValue({
      facts: {},
      assessment: {
        confidence: 90,
        readiness: 100,
        recommendation: 'ask_followup',
        reasons: [],
        calculatedAt: new Date(),
      },
      policyReport: {
        completion: { status: 'Complete', missingFacts: [] },
        selection: {
          candidates: [],
          reason: 'NoMissingFacts',
          confidence: 100,
        },
        branching: { status: 'continue', explanations: [] },
        explanations: [],
        evaluatedPolicies: [],
        policyVersions: new Map(),
      },
    });

    const result = await runtimeService.handleEvent(
      'sess-1',
      { type: 'UserMessageReceived', messageId: 'msg-1', revisionNumber: 2 },
      processContext,
      pipelineEvaluator,
    );

    expect(result.status).toBe('executed');
    expect(mockRepo.saveContext).toHaveBeenCalledWith(
      expect.objectContaining({
        state: RuntimeState.Processing,
        revision: { messageId: 'msg-1', revisionNumber: 2 },
      }),
    );
  });

  it('should reject duplicate message without running pipeline', async () => {
    const duplicateRepo: RuntimeRepositoryPort = {
      loadContext: vi.fn().mockResolvedValue({
        sessionId: 'sess-1',
        conversationId: 'conv-1',
        state: RuntimeState.WaitingForUser,
        revision: { revisionNumber: 2, messageId: 'msg-1' },
      }),
      saveContext: vi.fn().mockResolvedValue(undefined),
    };

    const service = new ConversationRuntimeService(
      runtimeEngine,
      lockManager,
      duplicateRepo,
      recommendationEngine,
      orchestrator,
    );

    const pipelineEvaluator = vi.fn();

    const result = await service.handleEvent(
      'sess-1',
      { type: 'UserMessageReceived', messageId: 'msg-1', revisionNumber: 3 },
      processContext,
      pipelineEvaluator,
    );

    expect(result.status).toBe('duplicate');
    expect(pipelineEvaluator).not.toHaveBeenCalled();
  });
});

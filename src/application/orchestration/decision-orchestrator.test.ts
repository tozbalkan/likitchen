import { describe, it, expect, vi } from 'vitest';
import { DecisionOrchestrator } from './decision-orchestrator';
import { ExecutionPlanner } from './execution-planner';
import { ActionHandlerRegistry } from './handlers/action-handler-registry';
import {
  RecommendationType,
  RecommendationSeverity,
} from '../../domain/conversation/recommendation/types';
import type { ProcessContext } from '../../shared/types';
import type { Clock } from '../ports/clock';

describe('DecisionOrchestrator', () => {
  const planner = new ExecutionPlanner();
  const registry = new ActionHandlerRegistry();
  const mockClock: Clock = { now: () => new Date('2026-07-27T20:00:00Z') };

  const readyHandler = {
    actionType: 'ReadyForQuotation' as const,
    execute: vi.fn().mockResolvedValue({ events: [] }),
  };

  registry.register(readyHandler);

  const orchestrator = new DecisionOrchestrator(planner, registry, mockClock);

  const processContext: ProcessContext = {
    correlationId: 'test-corr-1' as unknown as ProcessContext['correlationId'],
    traceId: 'test-trace-1' as unknown as ProcessContext['traceId'],
  };

  it('should execute plan actions and emit execution report', async () => {
    const decision = {
      recommendation: RecommendationType.ReadyForQuotation,
      winningRule: { name: 'ReadyForQuotationRule', version: '1.0.0' },
      severity: RecommendationSeverity.High,
      candidates: [],
      explanations: [],
    };

    const report = await orchestrator.execute(decision, processContext);

    expect(report.plan.actions).toHaveLength(1);
    expect(report.actions).toHaveLength(1);
    expect(report.actions[0]?.status).toBe('success');
    expect(readyHandler.execute).toHaveBeenCalled();
  });
});

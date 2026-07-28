import type { ApplicationRegistry } from './application-registry';
import { RecommendationEngine } from '../domain/conversation/recommendation/recommendation-engine';
import { DefaultRecommendationRule } from '../domain/conversation/recommendation/rules/default-recommendation-rule';
import { DecisionOrchestrator } from '../application/orchestration/decision-orchestrator';
import { ExecutionPlanner } from '../application/orchestration/execution-planner';
import { ActionHandlerRegistry } from '../application/orchestration/handlers/action-handler-registry';
import { RuntimeEngine } from '../domain/conversation/runtime/runtime-engine';
import { ConversationRuntimeService } from '../application/runtime/conversation-runtime-service';
import { RuntimeLockManager } from '../application/runtime/runtime-lock-manager';

export function registerUseCases(registry: ApplicationRegistry): void {
  // 1. Domain Engines
  const defaultRule = new DefaultRecommendationRule();
  const recommendationEngine = new RecommendationEngine([defaultRule]);
  const runtimeEngine = new RuntimeEngine();

  registry.register('RecommendationEngine', recommendationEngine);
  registry.register('RuntimeEngine', runtimeEngine);

  // 2. Application Orchestration
  const handlerRegistry = new ActionHandlerRegistry();
  const executionPlanner = new ExecutionPlanner();
  const mockClock = { now: () => new Date() };
  const orchestrator = new DecisionOrchestrator(
    executionPlanner,
    handlerRegistry,
    mockClock,
  );

  registry.register('DecisionOrchestrator', orchestrator);

  // 3. Runtime Supervisor Service
  const lockManager = new RuntimeLockManager({
    acquireLock: async () => true,
    releaseLock: async () => {},
  });

  const mockRepository = {
    loadContext: async () => null,
    saveContext: async () => {},
  };

  const runtimeService = new ConversationRuntimeService(
    runtimeEngine,
    lockManager,
    mockRepository,
    recommendationEngine,
    orchestrator,
  );

  registry.register('ConversationRuntimeService', runtimeService);
}

import type { ApplicationRegistry } from './application-registry';
import { ContextAssembler } from '../application/context-intelligence/services/context-assembler';
import { CharacterBasedTokenEstimator } from '../infrastructure/context-intelligence/character-token-estimator';
import { InMemoryContextSnapshotAdapter } from '../infrastructure/context-intelligence/in-memory-context-snapshot';
import type { ExecutionPlanRepositoryPort } from '../application/planning-orchestration/ports/execution-plan-repository-port';
import { MemoryAccessEvaluator } from '../application/memory-knowledge/services/memory-access-evaluator';
import { HybridRetrievalEngine } from '../application/memory-knowledge/services/hybrid-retrieval-engine';
import { MemoryConflictResolver } from '../application/memory-knowledge/services/memory-conflict-resolver';

export function registerContextIntelligence(
  registry: ApplicationRegistry,
): void {
  // 1. Infrastructure Adapters
  const tokenEstimator = new CharacterBasedTokenEstimator();
  registry.register('ContextTokenEstimatorPort', tokenEstimator);

  const snapshotRepo = new InMemoryContextSnapshotAdapter();
  registry.register('ContextSnapshotRepositoryPort', snapshotRepo);

  // 2. Resolve Capability-024 and Capability-025 dependencies
  const executionPlanRepo = registry.resolve<ExecutionPlanRepositoryPort>(
    'ExecutionPlanRepositoryPort',
  );
  const accessEvaluator = registry.resolve<MemoryAccessEvaluator>(
    'MemoryAccessEvaluator',
  );
  const retrievalEngine = registry.resolve<HybridRetrievalEngine>(
    'HybridRetrievalEngine',
  );
  const conflictResolver = registry.resolve<MemoryConflictResolver>(
    'MemoryConflictResolver',
  );

  // 3. Context Assembler (Capability-026 primary service)
  const contextAssembler = new ContextAssembler(
    executionPlanRepo,
    accessEvaluator,
    retrievalEngine,
    conflictResolver,
    tokenEstimator,
    snapshotRepo,
  );
  registry.register('ContextAssembler', contextAssembler);
}

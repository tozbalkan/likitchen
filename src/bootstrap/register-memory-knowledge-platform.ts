import type { ApplicationRegistry } from './application-registry';
import { InMemoryMemoryRepositoryAdapter } from '../infrastructure/memory-knowledge/in-memory-memory-repository';
import { InMemoryKnowledgeRepositoryAdapter } from '../infrastructure/memory-knowledge/in-memory-knowledge-repository';
import { MemoryAccessEvaluator } from '../application/memory-knowledge/services/memory-access-evaluator';
import { HybridRetrievalEngine } from '../application/memory-knowledge/services/hybrid-retrieval-engine';
import { MemoryConflictResolver } from '../application/memory-knowledge/services/memory-conflict-resolver';
import { KnowledgeIngestionService } from '../application/memory-knowledge/services/knowledge-ingestion-service';
import { PlanExecutionArtifactKnowledgeBridge } from '../infrastructure/memory-knowledge/adapters/plan-execution-artifact-knowledge-bridge';

export function registerMemoryKnowledgePlatform(
  registry: ApplicationRegistry,
): void {
  // 1. Repositories
  const memoryRepo = new InMemoryMemoryRepositoryAdapter();
  registry.register('MemoryRepositoryPort', memoryRepo);

  const knowledgeRepo = new InMemoryKnowledgeRepositoryAdapter();
  registry.register('KnowledgeRepositoryPort', knowledgeRepo);

  // 2. Services
  const accessEvaluator = new MemoryAccessEvaluator(memoryRepo, knowledgeRepo);
  registry.register('MemoryAccessEvaluator', accessEvaluator);

  const retrievalEngine = new HybridRetrievalEngine();
  registry.register('HybridRetrievalEngine', retrievalEngine);

  const conflictResolver = new MemoryConflictResolver();
  registry.register('MemoryConflictResolver', conflictResolver);

  const ingestionService = new KnowledgeIngestionService(knowledgeRepo);
  registry.register('KnowledgeIngestionService', ingestionService);

  // 3. Capability-024 Bridge Adapter
  const artifactBridge = new PlanExecutionArtifactKnowledgeBridge(
    ingestionService,
    knowledgeRepo,
  );
  registry.register('PlanExecutionArtifactKnowledgeBridge', artifactBridge);
}

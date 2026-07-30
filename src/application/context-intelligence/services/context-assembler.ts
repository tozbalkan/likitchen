import { randomUUID } from 'node:crypto';
import { TenantContext } from '../../identity/tenant-context';
import type { MemoryAccessEvaluator } from '../../memory-knowledge/services/memory-access-evaluator';
import type { HybridRetrievalEngine } from '../../memory-knowledge/services/hybrid-retrieval-engine';
import type { MemoryConflictResolver } from '../../memory-knowledge/services/memory-conflict-resolver';
import type { ExecutionPlanRepositoryPort } from '../../planning-orchestration/ports/execution-plan-repository-port';
import type { ContextTokenEstimatorPort } from '../ports/context-token-estimator-port';
import type { ContextSnapshotRepositoryPort } from '../ports/context-snapshot-repository-port';
import type { ContextAssemblyRequest } from '../vo/context-assembly-request';
import { ContextSnapshot } from '../domain/context-snapshot';
import { ContextAssemblyTrace } from '../vo/context-assembly-trace';
import { ContextCandidateCollector } from './pipeline/context-candidate-collector';
import { ContextNormalizer } from './pipeline/context-normalizer';
import { ContextConflictDetector } from './pipeline/context-conflict-detector';
import { ContextPrioritizerAndBudgetReducer } from './pipeline/context-prioritizer';

/**
 * ContextAssembler — Facade Orchestrator for Capability-026.
 *
 * Executes the 11-step pipeline via modular step services:
 * - ContextCandidateCollector: Authorized candidate gathering from 024 + 025
 * - ContextNormalizer: Data mapping to ContextEntry with EvidenceReference
 * - ContextConflictDetector: Semantic conflict detection (DEFERRED_TO_AGENT)
 * - ContextPrioritizerAndBudgetReducer: Deterministic sorting & budget ceiling
 * - ContextSnapshot: SHA-256 checksum & immutable snapshot creation
 * - ContextSnapshotRepositoryPort: Mandatory tenant-isolated persistence
 *
 * NEVER directly accesses MemoryRepositoryPort or KnowledgeRepositoryPort.
 */
export class ContextAssembler {
  private readonly collector: ContextCandidateCollector;
  private readonly normalizer: ContextNormalizer;
  private readonly conflictDetector: ContextConflictDetector;
  private readonly prioritizer: ContextPrioritizerAndBudgetReducer;

  constructor(
    executionPlanRepo: ExecutionPlanRepositoryPort,
    accessEvaluator: MemoryAccessEvaluator,
    retrievalEngine: HybridRetrievalEngine,
    _conflictResolver: MemoryConflictResolver,
    tokenEstimator: ContextTokenEstimatorPort,
    private readonly snapshotRepo: ContextSnapshotRepositoryPort,
  ) {
    this.collector = new ContextCandidateCollector(
      accessEvaluator,
      retrievalEngine,
      executionPlanRepo,
    );
    this.normalizer = new ContextNormalizer(tokenEstimator);
    this.conflictDetector = new ContextConflictDetector();
    this.prioritizer = new ContextPrioritizerAndBudgetReducer();
  }

  async assemble(
    request: Readonly<ContextAssemblyRequest>,
  ): Promise<ContextSnapshot> {
    const assemblyStart = Date.now();

    const tenantContext = TenantContext.create({
      tenantId: request.tenantId,
      organizationId: request.organizationId,
      workspaceId: request.workspaceId,
      environment: 'production',
      region: 'default',
    });

    // 1. Idempotency check — return cached snapshot if exists
    const existingSnapshot = await this.snapshotRepo.findSnapshotByRequestId(
      tenantContext,
      request.requestId,
    );
    if (existingSnapshot) {
      return existingSnapshot;
    }

    // 2. Gather candidates from 024 + 025
    const authStart = Date.now();
    const candidates = await this.collector.collectCandidates(
      tenantContext,
      request,
    );
    const authDuration = Date.now() - authStart;

    // 3. Normalize into ContextEntry VOs
    const normStart = Date.now();
    const rawEntries = this.normalizer.normalize(
      tenantContext,
      request,
      candidates,
    );
    const normDuration = Date.now() - normStart;

    // 4. Detect semantic conflicts (DEFERRED_TO_AGENT)
    const conflictStart = Date.now();
    const { taggedEntries, conflicts } =
      this.conflictDetector.detectConflicts(rawEntries);
    const conflictDuration = Date.now() - conflictStart;

    // 5. Deterministic priority sorting & greedy budget enforcement
    const orderStart = Date.now();
    const budgetResult = this.prioritizer.process(taggedEntries, request);
    const orderDuration = Date.now() - orderStart;

    // 6. Build assembly trace
    const assemblyTrace = new ContextAssemblyTrace({
      assemblyDurationMs: Date.now() - assemblyStart,
      retrievalDurationMs: authDuration,
      authorizationDurationMs: authDuration,
      normalizationDurationMs: normDuration,
      conflictDetectionDurationMs: conflictDuration,
      orderingDurationMs: orderDuration,
      sourceCounts: budgetResult.sourceCounts,
      candidateCounts: candidates.candidateCounts,
      totalTokensUsed: budgetResult.totalTokensUsed,
      totalItemsIncluded: budgetResult.includedEntries.length,
      totalItemsDiscarded: budgetResult.totalItemsDiscarded,
      utilizationBySource: budgetResult.utilizationBySource,
    });

    // 7. Compute SHA-256 checksum
    const checksum = ContextSnapshot.computeChecksum(
      request,
      budgetResult.includedEntries,
      conflicts,
    );

    // 8. Instantiate immutable ContextSnapshot
    const snapshot = new ContextSnapshot({
      snapshotId: `ctx-${randomUUID()}`,
      requestId: request.requestId,
      tenantId: request.tenantId,
      organizationId: request.organizationId,
      workspaceId: request.workspaceId,
      userId: request.userId,
      planInstanceId: request.planInstanceId,
      nodeId: request.nodeId,
      query: request.query,
      entries: budgetResult.includedEntries,
      conflicts,
      assemblyTrace,
      snapshotChecksum: checksum,
      snapshotVersion: 1,
      createdAt: new Date(),
    });

    // 9. Mandatory persistence
    await this.snapshotRepo.saveSnapshot(tenantContext, snapshot);

    return snapshot;
  }
}

import { randomUUID } from 'node:crypto';
import { TenantContext } from '../../identity/tenant-context';
import { MemoryScopeContext } from '../../memory-knowledge/vo/memory-scope-context';
import type { MemoryScope } from '../../memory-knowledge/vo/memory-scope-context';
import { MemoryAccessEvaluator } from '../../memory-knowledge/services/memory-access-evaluator';
import { HybridRetrievalEngine } from '../../memory-knowledge/services/hybrid-retrieval-engine';
import { MemoryConflictResolver } from '../../memory-knowledge/services/memory-conflict-resolver';
import type { ExecutionPlanRepositoryPort } from '../../planning-orchestration/ports/execution-plan-repository-port';
import type { ContextTokenEstimatorPort } from '../ports/context-token-estimator-port';
import type { ContextSnapshotRepositoryPort } from '../ports/context-snapshot-repository-port';
import { ContextAssemblyRequest } from '../vo/context-assembly-request';
import { ContextEntry } from '../vo/context-entry';
import { ContextConflict } from '../vo/context-conflict';
import { ContextSnapshot } from '../domain/context-snapshot';
import { ContextAssemblyTrace } from '../vo/context-assembly-trace';
import type { ContextSourceType } from '../vo/context-source-type';
import { getSourcePriority } from '../vo/context-source-type';
import type {
  EvidenceReference,
  MemoryEvidence,
  KnowledgeEvidence,
  ArtifactEvidence,
  VariableEvidence,
  ExecutionTraceEvidence,
  SystemContextEvidence,
} from '../vo/evidence-reference';
import type { SourceUtilization } from '../vo/context-assembly-trace';

/**
 * Scope specificity ordering for multi-scope precedence.
 * More specific scopes have higher precedence values.
 */
const SCOPE_SPECIFICITY: ReadonlyMap<MemoryScope, number> = new Map([
  ['TENANT', 1],
  ['ORGANIZATION', 2],
  ['WORKSPACE', 3],
  ['USER', 4],
  ['PLAN_INSTANCE', 5],
]);

function getScopeSpecificity(scope: MemoryScope): number {
  return SCOPE_SPECIFICITY.get(scope) ?? 0;
}

/**
 * ContextAssembler — Primary application service for Capability-026.
 *
 * Orchestrates the deterministic context assembly pipeline:
 * 1. Validate request
 * 2. Establish scope boundaries
 * 3. Authorize via Capability-025
 * 4. Gather candidates from 024 + 025
 * 5. Normalize to ContextEntry[]
 * 6. Detect conflicts
 * 7. Deterministic ordering + budget enforcement
 * 8. Create immutable ContextSnapshot
 * 9. Persist snapshot (mandatory)
 * 10. Return snapshot + conflict metadata
 *
 * NEVER directly accesses MemoryRepositoryPort or KnowledgeRepositoryPort.
 */
export class ContextAssembler {
  constructor(
    private readonly executionPlanRepo: ExecutionPlanRepositoryPort,
    private readonly accessEvaluator: MemoryAccessEvaluator,
    private readonly retrievalEngine: HybridRetrievalEngine,
    private readonly conflictResolver: MemoryConflictResolver,
    private readonly tokenEstimator: ContextTokenEstimatorPort,
    private readonly snapshotRepo: ContextSnapshotRepositoryPort,
  ) {}

  async assemble(
    request: Readonly<ContextAssemblyRequest>,
  ): Promise<ContextSnapshot> {
    const assemblyStart = Date.now();

    // 0. Build TenantContext for downstream calls
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

    // 2. Authorization + multi-scope candidate gathering
    const authStart = Date.now();
    const allEntries: ContextEntry[] = [];
    const candidateCounts = new Map<ContextSourceType, number>();
    const sourceCounts = new Map<ContextSourceType, number>();

    // 2a. Build scope contexts and gather authorized candidates for each permitted scope
    const retrievalStart = Date.now();
    for (const scope of request.permittedScopes) {
      const scopeCtx = this.buildScopeContext(tenantContext, scope, request);
      if (!scopeCtx) continue;

      const authorizedCandidates =
        await this.accessEvaluator.buildAuthorizedCandidateSet(
          tenantContext,
          scopeCtx,
        );

      // Retrieve memory + knowledge via Capability-025 authorized APIs
      const searchResults = this.retrievalEngine.search(
        request.query,
        authorizedCandidates,
      );

      // Normalize memory results
      for (const result of searchResults) {
        if (result.type === 'MEMORY' && result.memoryRecord) {
          const mem = result.memoryRecord;
          const evidence: MemoryEvidence = {
            type: 'MEMORY',
            memoryId: mem.memoryId,
            memoryVersion: mem.memoryVersion,
            memoryType: mem.memoryType,
            key: mem.key,
            confidenceScore: mem.confidenceScore,
            retrievalScore: result.finalScore,
            selectionReason: `Retrieved via HybridRetrievalEngine for query '${request.query}' in scope ${scope}`,
          };
          allEntries.push(
            this.createEntry(
              'MEMORY',
              mem.memoryId,
              scope,
              scopeCtx.scopeId,
              mem.content,
              result.finalScore,
              evidence,
              mem.createdAt,
            ),
          );
        } else if (result.type === 'KNOWLEDGE' && result.knowledgeDocument) {
          const doc = result.knowledgeDocument;
          const activeVersion = doc.getActiveVersion();
          const evidence: KnowledgeEvidence = {
            type: 'KNOWLEDGE',
            knowledgeId: doc.knowledgeId,
            versionId: activeVersion.versionId,
            checksum: activeVersion.checksum,
            sourceUri: doc.provenance.sourceUri,
            sourceType: doc.sourceType,
            freshnessStatus: doc.freshness.revalidationStatus,
            retrievalScore: result.finalScore,
            selectionReason: `Retrieved via HybridRetrievalEngine for query '${request.query}' in scope ${scope}`,
          };
          allEntries.push(
            this.createEntry(
              'KNOWLEDGE',
              doc.knowledgeId,
              scope,
              scopeCtx.scopeId,
              activeVersion.contentChunks.join('\n'),
              result.finalScore,
              evidence,
              activeVersion.createdAt,
            ),
          );
        }
      }

      this.incrementCount(
        candidateCounts,
        'MEMORY',
        authorizedCandidates.memories.length,
      );
      this.incrementCount(
        candidateCounts,
        'KNOWLEDGE',
        authorizedCandidates.documents.length,
      );
    }
    const retrievalDuration = Date.now() - retrievalStart;
    const authDuration = Date.now() - authStart;

    // 3. Gather execution state from Capability-024 (read-only)
    const instance = await this.executionPlanRepo.findInstanceById(
      tenantContext,
      request.planInstanceId,
    );

    if (instance && instance.tenantId === request.tenantId) {
      // 3a. Variables
      for (const v of instance.variables) {
        const evidence: VariableEvidence = {
          type: 'VARIABLE',
          key: v.key,
          variableScope: v.scope,
          producerNodeId: v.producerNodeId,
          selectionReason: `Variable from ExecutionPlanInstance '${instance.instanceId}'`,
        };
        allEntries.push(
          this.createEntry(
            'VARIABLE',
            `var:${v.key}`,
            'PLAN_INSTANCE',
            request.planInstanceId,
            JSON.stringify(v.value),
            1.0,
            evidence,
            instance.createdAt,
          ),
        );
      }
      this.incrementCount(
        candidateCounts,
        'VARIABLE',
        instance.variables.length,
      );

      // 3b. Artifacts
      for (const a of instance.artifacts) {
        const evidence: ArtifactEvidence = {
          type: 'ARTIFACT',
          artifactId: a.artifactId,
          producerNodeId: a.producerNodeId,
          name: a.name,
          mimeType: a.mimeType,
          selectionReason: `Artifact from ExecutionPlanInstance '${instance.instanceId}'`,
        };
        allEntries.push(
          this.createEntry(
            'ARTIFACT',
            `art:${a.artifactId}`,
            'PLAN_INSTANCE',
            request.planInstanceId,
            `[Artifact: ${a.name}] URI: ${a.uri} (${a.mimeType}, ${a.sizeBytes} bytes)`,
            1.0,
            evidence,
            instance.createdAt,
          ),
        );
      }
      this.incrementCount(
        candidateCounts,
        'ARTIFACT',
        instance.artifacts.length,
      );

      // 3c. Execution Trace (recent spans for the target node and predecessors)
      const relevantSpans = instance.trace.spans.filter(
        (s) => s.status === 'SUCCESS' || s.status === 'FAILED',
      );
      for (const span of relevantSpans) {
        const evidence: ExecutionTraceEvidence = {
          type: 'EXECUTION_TRACE',
          spanId: span.spanId,
          nodeId: span.nodeId,
          behaviorType: span.behaviorType,
          status: span.status,
          selectionReason: `Execution trace span from plan instance '${instance.instanceId}'`,
        };
        const content = [
          `Node: ${span.nodeId} (${span.behaviorType})`,
          `Status: ${span.status}`,
          span.durationMs !== undefined ? `Duration: ${span.durationMs}ms` : '',
          span.error ? `Error: ${span.error}` : '',
        ]
          .filter(Boolean)
          .join(', ');
        allEntries.push(
          this.createEntry(
            'EXECUTION_TRACE',
            `span:${span.spanId}`,
            'PLAN_INSTANCE',
            request.planInstanceId,
            content,
            0.8,
            evidence,
            span.startTime,
          ),
        );
      }
      this.incrementCount(
        candidateCounts,
        'EXECUTION_TRACE',
        relevantSpans.length,
      );

      // 3d. System Context
      const systemEntries = [
        {
          key: 'execution.state',
          value: instance.state,
        },
        {
          key: 'execution.planId',
          value: instance.planId,
        },
        {
          key: 'execution.consumedCostUSD',
          value: String(instance.consumedCostUSD),
        },
        {
          key: 'execution.budget.maxCostUSD',
          value: String(instance.budget.maxCostUSD),
        },
        {
          key: 'tenant.environment',
          value: tenantContext.environment,
        },
        {
          key: 'tenant.region',
          value: tenantContext.region,
        },
      ];
      for (const sys of systemEntries) {
        const evidence: SystemContextEvidence = {
          type: 'SYSTEM_CONTEXT',
          contextKey: sys.key,
          selectionReason: 'System runtime context from execution instance',
        };
        allEntries.push(
          this.createEntry(
            'SYSTEM_CONTEXT',
            `sys:${sys.key}`,
            'PLAN_INSTANCE',
            request.planInstanceId,
            `${sys.key}=${sys.value}`,
            1.0,
            evidence,
            instance.updatedAt,
          ),
        );
      }
      this.incrementCount(
        candidateCounts,
        'SYSTEM_CONTEXT',
        systemEntries.length,
      );
    }

    // 4. Normalization duration
    const normStart = Date.now();
    // Deduplicate entries by sourceId within same scope
    const deduped = this.deduplicateEntries(allEntries);
    const normDuration = Date.now() - normStart;

    // 5. Conflict detection
    const conflictStart = Date.now();
    const conflicts = this.detectConflicts(deduped);
    // Tag competing entries
    const conflictEntryIds = new Set<string>();
    for (const c of conflicts) {
      for (const id of c.competingEntryIds) {
        conflictEntryIds.add(id);
      }
    }
    const taggedEntries = deduped.map((e) =>
      conflictEntryIds.has(e.entryId) ? e.withConflictStatus('COMPETING') : e,
    );
    const conflictDuration = Date.now() - conflictStart;

    // 6. Deterministic ordering
    const orderStart = Date.now();
    const sorted = this.deterministicSort(taggedEntries);

    // 7. Budget enforcement (greedy allocation)
    let tokenBudgetRemaining = request.tokenBudget;
    let itemBudgetRemaining = request.maxItems;
    const included: ContextEntry[] = [];
    let totalTokensUsed = 0;
    let totalDiscarded = 0;
    const utilizationBySource = new Map<
      ContextSourceType,
      { tokensUsed: number; itemsIncluded: number; itemsDiscarded: number }
    >();

    for (const entry of sorted) {
      if (
        entry.tokenEstimate <= tokenBudgetRemaining &&
        itemBudgetRemaining > 0
      ) {
        included.push(entry);
        tokenBudgetRemaining -= entry.tokenEstimate;
        itemBudgetRemaining--;
        totalTokensUsed += entry.tokenEstimate;
        const util = utilizationBySource.get(entry.sourceType) ?? {
          tokensUsed: 0,
          itemsIncluded: 0,
          itemsDiscarded: 0,
        };
        util.tokensUsed += entry.tokenEstimate;
        util.itemsIncluded++;
        utilizationBySource.set(entry.sourceType, util);
        this.incrementCount(sourceCounts, entry.sourceType, 1);
      } else {
        totalDiscarded++;
        const util = utilizationBySource.get(entry.sourceType) ?? {
          tokensUsed: 0,
          itemsIncluded: 0,
          itemsDiscarded: 0,
        };
        util.itemsDiscarded++;
        utilizationBySource.set(entry.sourceType, util);
      }
    }
    const orderDuration = Date.now() - orderStart;

    // 8. Build assembly trace
    const frozenUtilization = new Map<ContextSourceType, SourceUtilization>();
    for (const [k, v] of utilizationBySource.entries()) {
      frozenUtilization.set(k, Object.freeze({ ...v }));
    }

    const assemblyTrace = new ContextAssemblyTrace({
      assemblyDurationMs: Date.now() - assemblyStart,
      retrievalDurationMs: retrievalDuration,
      authorizationDurationMs: authDuration,
      normalizationDurationMs: normDuration,
      conflictDetectionDurationMs: conflictDuration,
      orderingDurationMs: orderDuration,
      sourceCounts,
      candidateCounts,
      totalTokensUsed,
      totalItemsIncluded: included.length,
      totalItemsDiscarded: totalDiscarded,
      utilizationBySource: frozenUtilization,
    });

    // 9. Compute deterministic checksum
    const checksum = ContextSnapshot.computeChecksum(
      request,
      included,
      conflicts,
    );

    // 10. Create immutable ContextSnapshot
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
      entries: included,
      conflicts,
      assemblyTrace,
      snapshotChecksum: checksum,
      snapshotVersion: 1,
      createdAt: new Date(),
    });

    // 11. Mandatory persistence
    await this.snapshotRepo.saveSnapshot(tenantContext, snapshot);

    return snapshot;
  }

  // ─── Private helpers ─────────────────────────────────────────────

  private buildScopeContext(
    tenant: TenantContext,
    scope: MemoryScope,
    request: Readonly<ContextAssemblyRequest>,
  ): MemoryScopeContext | undefined {
    switch (scope) {
      case 'TENANT':
        return MemoryScopeContext.fromTenant(tenant);
      case 'WORKSPACE':
        return MemoryScopeContext.fromWorkspace(tenant);
      case 'USER':
        if (!request.userId) return undefined;
        return MemoryScopeContext.fromUser(tenant, request.userId);
      case 'PLAN_INSTANCE':
        return MemoryScopeContext.fromPlanInstance(
          tenant,
          request.planInstanceId,
        );
      case 'ORGANIZATION':
        return new MemoryScopeContext({
          scope: 'ORGANIZATION',
          tenantId: tenant.tenantId,
          organizationId: tenant.organizationId,
        });
      default:
        return undefined;
    }
  }

  private createEntry(
    sourceType: ContextSourceType,
    sourceId: string,
    scope: MemoryScope,
    scopeId: string,
    content: string,
    relevanceScore: number,
    evidence: EvidenceReference,
    createdAt: Date,
  ): ContextEntry {
    const tokenEstimate = this.tokenEstimator.estimateTokens(content);
    const sourcePriority = getSourcePriority(sourceType);
    const scopeSpec = getScopeSpecificity(scope);
    // Priority = scopeSpecificity * 10000 + sourcePriority * 1000 + relevanceScore * 100
    const priority =
      scopeSpec * 10000 +
      sourcePriority * 1000 +
      Math.round(relevanceScore * 100);

    return new ContextEntry({
      entryId: `entry-${randomUUID()}`,
      sourceType,
      sourceId,
      scope,
      scopeId,
      priority,
      content,
      tokenEstimate,
      relevanceScore,
      evidence,
      conflictStatus: 'NONE',
      createdAt,
    });
  }

  private deduplicateEntries(entries: ContextEntry[]): ContextEntry[] {
    const seen = new Map<string, ContextEntry>();
    for (const entry of entries) {
      const dedupeKey = `${entry.sourceType}:${entry.sourceId}:${entry.scope}:${entry.scopeId}`;
      const existing = seen.get(dedupeKey);
      if (!existing || entry.priority > existing.priority) {
        seen.set(dedupeKey, entry);
      }
    }
    return Array.from(seen.values());
  }

  /**
   * Detect semantic conflicts: same semantic key with different values
   * across different sources or scopes.
   */
  private detectConflicts(
    entries: ReadonlyArray<ContextEntry>,
  ): ContextConflict[] {
    const conflicts: ContextConflict[] = [];

    // Group entries by semantic key (sourceId without scope prefix)
    const groups = new Map<string, ContextEntry[]>();
    for (const entry of entries) {
      // Use sourceId as semantic key for cross-scope conflict detection
      const semanticKey = entry.sourceId;
      const group = groups.get(semanticKey) ?? [];
      group.push(entry);
      groups.set(semanticKey, group);
    }

    for (const [semanticKey, group] of groups.entries()) {
      if (group.length < 2) continue;

      // Check for actual content disagreement
      const uniqueContents = new Set(group.map((e) => e.content));
      if (uniqueContents.size <= 1) continue;

      // This is a genuine semantic conflict
      conflicts.push(
        new ContextConflict({
          conflictId: `conflict-${randomUUID()}`,
          semanticKey,
          competingEntryIds: group.map((e) => e.entryId),
          conflictType:
            group.some((e) => e.sourceType === 'MEMORY') &&
            group.some((e) => e.sourceType === 'KNOWLEDGE')
              ? 'MEMORY_VS_KNOWLEDGE'
              : 'CROSS_SCOPE_DISAGREEMENT',
          priorityMetadata: group.map((e) => ({
            entryId: e.entryId,
            priority: e.priority,
            sourceType: e.sourceType,
          })),
          resolutionState: 'DEFERRED_TO_AGENT',
          evidence: group.map((e) => e.evidence),
        }),
      );
    }

    // Also detect conflicts from Capability-025 MemoryConflictResolver
    const memoryEntries = entries.filter((e) => e.sourceType === 'MEMORY');
    if (memoryEntries.length > 1) {
      // Group by memory key
      const memKeyGroups = new Map<string, ContextEntry[]>();
      for (const me of memoryEntries) {
        if (me.evidence.type === 'MEMORY') {
          const k = me.evidence.key;
          const grp = memKeyGroups.get(k) ?? [];
          grp.push(me);
          memKeyGroups.set(k, grp);
        }
      }

      for (const [key, grp] of memKeyGroups.entries()) {
        if (grp.length < 2) continue;
        const uniqueContents = new Set(grp.map((e) => e.content));
        if (uniqueContents.size <= 1) continue;

        // Check if this conflict is already detected
        const alreadyDetected = conflicts.some(
          (c) =>
            c.competingEntryIds.length === grp.length &&
            grp.every((e) => c.competingEntryIds.includes(e.entryId)),
        );
        if (alreadyDetected) continue;

        conflicts.push(
          new ContextConflict({
            conflictId: `conflict-${randomUUID()}`,
            semanticKey: `memory:${key}`,
            competingEntryIds: grp.map((e) => e.entryId),
            conflictType: 'CONTRADICTORY_MEMORY_FACTS',
            priorityMetadata: grp.map((e) => ({
              entryId: e.entryId,
              priority: e.priority,
              sourceType: e.sourceType,
            })),
            resolutionState: 'DEFERRED_TO_AGENT',
            evidence: grp.map((e) => e.evidence),
          }),
        );
      }
    }

    return conflicts;
  }

  /**
   * Deterministic sort:
   * 1. scope specificity DESC (more specific first)
   * 2. source priority DESC (SYSTEM_CONTEXT > VARIABLE > ...)
   * 3. relevance score DESC
   * 4. entryId ASC (lexicographic tie-breaker)
   */
  private deterministicSort(entries: ContextEntry[]): ContextEntry[] {
    return [...entries].sort((a, b) => {
      // Primary: priority DESC (already encodes scope specificity + source priority + relevance)
      if (a.priority !== b.priority) {
        return b.priority - a.priority;
      }
      // Secondary: relevance score DESC
      if (Math.abs(b.relevanceScore - a.relevanceScore) > 0.0001) {
        return b.relevanceScore - a.relevanceScore;
      }
      // Tertiary: entryId ASC (deterministic lexicographic tie-breaker)
      return a.entryId.localeCompare(b.entryId);
    });
  }

  private incrementCount(
    map: Map<ContextSourceType, number>,
    key: ContextSourceType,
    count: number,
  ): void {
    map.set(key, (map.get(key) ?? 0) + count);
  }
}

import { randomUUID } from 'node:crypto';
import type { TenantContext } from '../../../identity/tenant-context';
import type { MemoryScope } from '../../../memory-knowledge/vo/memory-scope-context';
import type { ContextTokenEstimatorPort } from '../../ports/context-token-estimator-port';
import { ContextEntry } from '../../vo/context-entry';
import type { ContextSourceType } from '../../vo/context-source-type';
import { getSourcePriority } from '../../vo/context-source-type';
import type {
  EvidenceReference,
  MemoryEvidence,
  KnowledgeEvidence,
  ArtifactEvidence,
  VariableEvidence,
  ExecutionTraceEvidence,
  SystemContextEvidence,
} from '../../vo/evidence-reference';
import type { RawCandidateSet } from './context-candidate-collector';
import type { ContextAssemblyRequest } from '../../vo/context-assembly-request';

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
 * Single-responsibility service for normalizing raw candidate records
 * into ContextEntry VOs with mandatory EvidenceReference provenance.
 */
export class ContextNormalizer {
  constructor(private readonly tokenEstimator: ContextTokenEstimatorPort) {}

  normalize(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<ContextAssemblyRequest>,
    candidates: Readonly<RawCandidateSet>,
  ): ReadonlyArray<ContextEntry> {
    const allEntries: ContextEntry[] = [];

    // 1. Normalize Memory & Knowledge results
    for (const item of candidates.memoryAndKnowledgeResults) {
      const res = item.searchResult;
      if (res.type === 'MEMORY' && res.memoryRecord) {
        const mem = res.memoryRecord;
        const evidence: MemoryEvidence = {
          type: 'MEMORY',
          memoryId: mem.memoryId,
          memoryVersion: mem.memoryVersion,
          memoryType: mem.memoryType,
          key: mem.key,
          confidenceScore: mem.confidenceScore,
          retrievalScore: res.finalScore,
          selectionReason: `Retrieved via HybridRetrievalEngine for query '${request.query}' in scope ${item.scope}`,
        };
        allEntries.push(
          this.createEntry(
            'MEMORY',
            mem.memoryId,
            item.scope,
            item.scopeId,
            mem.content,
            res.finalScore,
            evidence,
            mem.createdAt,
          ),
        );
      } else if (res.type === 'KNOWLEDGE' && res.knowledgeDocument) {
        const doc = res.knowledgeDocument;
        const activeVersion = doc.getActiveVersion();
        const evidence: KnowledgeEvidence = {
          type: 'KNOWLEDGE',
          knowledgeId: doc.knowledgeId,
          versionId: activeVersion.versionId,
          checksum: activeVersion.checksum,
          sourceUri: doc.provenance.sourceUri,
          sourceType: doc.sourceType,
          freshnessStatus: doc.freshness.revalidationStatus,
          retrievalScore: res.finalScore,
          selectionReason: `Retrieved via HybridRetrievalEngine for query '${request.query}' in scope ${item.scope}`,
        };
        allEntries.push(
          this.createEntry(
            'KNOWLEDGE',
            doc.knowledgeId,
            item.scope,
            item.scopeId,
            activeVersion.contentChunks.join('\n'),
            res.finalScore,
            evidence,
            activeVersion.createdAt,
          ),
        );
      }
    }

    // 2. Normalize Execution State from Capability-024
    const instance = candidates.executionInstance;
    if (instance) {
      // 2a. Variables
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

      // 2b. Artifacts
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

      // 2c. Execution Trace Spans
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

      // 2d. System Context
      const systemEntries = [
        { key: 'execution.state', value: instance.state },
        { key: 'execution.planId', value: instance.planId },
        {
          key: 'execution.consumedCostUSD',
          value: String(instance.consumedCostUSD),
        },
        {
          key: 'execution.budget.maxCostUSD',
          value: String(instance.budget.maxCostUSD),
        },
        { key: 'tenant.environment', value: tenantContext.environment },
        { key: 'tenant.region', value: tenantContext.region },
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
    }

    // 3. Deduplicate by (sourceType, sourceId, scope, scopeId)
    return Object.freeze(this.deduplicateEntries(allEntries));
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
}

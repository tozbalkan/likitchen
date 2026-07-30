import { TenantContext } from '../../../identity/tenant-context';
import { MemoryScopeContext } from '../../../memory-knowledge/vo/memory-scope-context';
import type { MemoryScope } from '../../../memory-knowledge/vo/memory-scope-context';
import type { MemoryAccessEvaluator } from '../../../memory-knowledge/services/memory-access-evaluator';
import type {
  HybridRetrievalEngine,
  SearchResultItem,
} from '../../../memory-knowledge/services/hybrid-retrieval-engine';
import type { ExecutionPlanRepositoryPort } from '../../../planning-orchestration/ports/execution-plan-repository-port';
import type { ContextAssemblyRequest } from '../../vo/context-assembly-request';
import type { ContextSourceType } from '../../vo/context-source-type';
import type { ExecutionPlanInstance } from '../../../planning-orchestration/domain/execution-plan-instance';

export interface RawCandidateSet {
  readonly memoryAndKnowledgeResults: ReadonlyArray<{
    readonly scope: MemoryScope;
    readonly scopeId: string;
    readonly searchResult: SearchResultItem;
  }>;
  readonly executionInstance?: ExecutionPlanInstance | undefined;
  readonly candidateCounts: ReadonlyMap<ContextSourceType, number>;
}

/**
 * Single-responsibility service for gathering authorized candidates from 025 and 024.
 * Never directly queries raw repositories.
 */
export class ContextCandidateCollector {
  constructor(
    private readonly accessEvaluator: MemoryAccessEvaluator,
    private readonly retrievalEngine: HybridRetrievalEngine,
    private readonly executionPlanRepo: ExecutionPlanRepositoryPort,
  ) {}

  async collectCandidates(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<ContextAssemblyRequest>,
  ): Promise<RawCandidateSet> {
    const memoryAndKnowledgeResults: Array<{
      scope: MemoryScope;
      scopeId: string;
      searchResult: SearchResultItem;
    }> = [];
    const candidateCounts = new Map<ContextSourceType, number>();

    // 1. Gather memory & knowledge across permitted scopes via Capability-025 authorized APIs
    for (const scope of request.permittedScopes) {
      const scopeCtx = this.buildScopeContext(tenantContext, scope, request);
      if (!scopeCtx) continue;

      const authorizedCandidates =
        await this.accessEvaluator.buildAuthorizedCandidateSet(
          tenantContext,
          scopeCtx,
        );

      const searchResults = this.retrievalEngine.search(
        request.query,
        authorizedCandidates,
      );

      for (const res of searchResults) {
        memoryAndKnowledgeResults.push({
          scope,
          scopeId: scopeCtx.scopeId,
          searchResult: res,
        });
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

    // 2. Gather execution state from Capability-024 (read-only)
    const instance = await this.executionPlanRepo.findInstanceById(
      tenantContext,
      request.planInstanceId,
    );

    if (instance && instance.tenantId === request.tenantId) {
      this.incrementCount(
        candidateCounts,
        'VARIABLE',
        instance.variables.length,
      );
      this.incrementCount(
        candidateCounts,
        'ARTIFACT',
        instance.artifacts.length,
      );
      const spansCount = instance.trace.spans.filter(
        (s) => s.status === 'SUCCESS' || s.status === 'FAILED',
      ).length;
      this.incrementCount(candidateCounts, 'EXECUTION_TRACE', spansCount);
      this.incrementCount(candidateCounts, 'SYSTEM_CONTEXT', 6);
    }

    return Object.freeze({
      memoryAndKnowledgeResults: Object.freeze(memoryAndKnowledgeResults),
      executionInstance: instance,
      candidateCounts: Object.freeze(candidateCounts),
    });
  }

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

  private incrementCount(
    map: Map<ContextSourceType, number>,
    key: ContextSourceType,
    count: number,
  ): void {
    map.set(key, (map.get(key) ?? 0) + count);
  }
}

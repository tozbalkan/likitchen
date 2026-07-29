import { TenantContext } from '../../identity/tenant-context';
import { MemoryRecord } from '../domain/memory-record';
import { KnowledgeDocument } from '../domain/knowledge-document';
import { MemoryScopeContext } from '../vo/memory-scope-context';
import type { MemoryRepositoryPort } from '../ports/memory-repository-port';
import type { KnowledgeRepositoryPort } from '../ports/knowledge-repository-port';

export class AuthorizedCandidateSet {
  readonly memories: ReadonlyArray<MemoryRecord>;
  readonly documents: ReadonlyArray<KnowledgeDocument>;

  constructor(
    memories: ReadonlyArray<MemoryRecord>,
    documents: ReadonlyArray<KnowledgeDocument>,
  ) {
    this.memories = Object.freeze([...memories]);
    this.documents = Object.freeze([...documents]);
    Object.freeze(this);
  }
}

export class MemoryAccessEvaluator {
  constructor(
    private readonly memoryRepo: MemoryRepositoryPort,
    private readonly knowledgeRepo: KnowledgeRepositoryPort,
  ) {}

  async buildAuthorizedCandidateSet(
    tenantContext: Readonly<TenantContext>,
    targetScopeContext: Readonly<MemoryScopeContext>,
  ): Promise<AuthorizedCandidateSet> {
    // 1. Strict Tenant Boundary Check
    if (targetScopeContext.tenantId !== tenantContext.tenantId) {
      throw new Error(
        `[MemoryAccessEvaluator] Cross-tenant access violation: Caller tenant '${tenantContext.tenantId}' requested scope for tenant '${targetScopeContext.tenantId}'.`,
      );
    }

    // 2. Strict Scope Boundary Validations
    if (
      targetScopeContext.organizationId &&
      tenantContext.organizationId &&
      targetScopeContext.organizationId !== tenantContext.organizationId
    ) {
      throw new Error(
        `[MemoryAccessEvaluator] Scope boundary violation: Target organization '${targetScopeContext.organizationId}' does not match caller organization '${tenantContext.organizationId}'.`,
      );
    }

    if (
      targetScopeContext.workspaceId &&
      tenantContext.workspaceId &&
      targetScopeContext.workspaceId !== tenantContext.workspaceId
    ) {
      throw new Error(
        `[MemoryAccessEvaluator] Scope boundary violation: Target workspace '${targetScopeContext.workspaceId}' does not match caller workspace '${tenantContext.workspaceId}'.`,
      );
    }

    // 3. Fetch candidate memories & knowledge documents
    const rawMemories = await this.memoryRepo.listMemoriesByScope(
      tenantContext,
      targetScopeContext,
      false, // Never include DELETED tombstones in authorized candidate set
    );

    const rawDocs = await this.knowledgeRepo.listDocumentsByScope(
      tenantContext,
      targetScopeContext,
    );

    // 4. Apply strict retrievable filtering (only ACTIVE memories, valid tenant context)
    const authorizedMemories = rawMemories.filter(
      (m) =>
        m.state === 'ACTIVE' &&
        m.scopeContext.tenantId === tenantContext.tenantId,
    );

    const authorizedDocs = rawDocs.filter(
      (d) => d.scopeContext.tenantId === tenantContext.tenantId,
    );

    return new AuthorizedCandidateSet(authorizedMemories, authorizedDocs);
  }
}

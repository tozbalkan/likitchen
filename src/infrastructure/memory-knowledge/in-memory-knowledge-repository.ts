import type { KnowledgeRepositoryPort } from '../../application/memory-knowledge/ports/knowledge-repository-port';
import { KnowledgeDocument } from '../../application/memory-knowledge/domain/knowledge-document';
import { MemoryScopeContext } from '../../application/memory-knowledge/vo/memory-scope-context';
import { TenantContext } from '../../application/identity/tenant-context';

export class InMemoryKnowledgeRepositoryAdapter implements KnowledgeRepositoryPort {
  private readonly docs = new Map<string, Map<string, KnowledgeDocument>>();

  private getTenantStore(tenantId: string): Map<string, KnowledgeDocument> {
    let store = this.docs.get(tenantId);
    if (!store) {
      store = new Map<string, KnowledgeDocument>();
      this.docs.set(tenantId, store);
    }
    return store;
  }

  async saveDocument(
    tenantContext: Readonly<TenantContext>,
    document: Readonly<KnowledgeDocument>,
  ): Promise<void> {
    if (document.scopeContext.tenantId !== tenantContext.tenantId) {
      throw new Error(
        `[InMemoryKnowledgeRepositoryAdapter] Security violation: Tenant '${tenantContext.tenantId}' cannot write document for tenant '${document.scopeContext.tenantId}'.`,
      );
    }

    const store = this.getTenantStore(tenantContext.tenantId);
    store.set(document.knowledgeId, document as KnowledgeDocument);
  }

  async findDocumentById(
    tenantContext: Readonly<TenantContext>,
    knowledgeId: string,
  ): Promise<KnowledgeDocument | undefined> {
    const store = this.getTenantStore(tenantContext.tenantId);
    const doc = store.get(knowledgeId);
    if (!doc) return undefined;
    if (doc.scopeContext.tenantId !== tenantContext.tenantId) return undefined;
    return doc;
  }

  async findDocumentBySourceUri(
    tenantContext: Readonly<TenantContext>,
    scopeContext: Readonly<MemoryScopeContext>,
    sourceUri: string,
  ): Promise<KnowledgeDocument | undefined> {
    if (scopeContext.tenantId !== tenantContext.tenantId) {
      throw new Error(
        `[InMemoryKnowledgeRepositoryAdapter] Security violation: Cross-tenant access attempted by '${tenantContext.tenantId}'.`,
      );
    }

    const store = this.getTenantStore(tenantContext.tenantId);
    for (const doc of store.values()) {
      if (
        doc.scopeContext.scope === scopeContext.scope &&
        doc.scopeContext.scopeId === scopeContext.scopeId &&
        doc.provenance.sourceUri === sourceUri
      ) {
        return doc;
      }
    }
    return undefined;
  }

  async listDocumentsByScope(
    tenantContext: Readonly<TenantContext>,
    scopeContext: Readonly<MemoryScopeContext>,
  ): Promise<ReadonlyArray<KnowledgeDocument>> {
    if (scopeContext.tenantId !== tenantContext.tenantId) {
      throw new Error(
        `[InMemoryKnowledgeRepositoryAdapter] Security violation: Cross-tenant access attempted by '${tenantContext.tenantId}'.`,
      );
    }

    const store = this.getTenantStore(tenantContext.tenantId);
    const results: KnowledgeDocument[] = [];

    for (const doc of store.values()) {
      if (
        doc.scopeContext.scope === scopeContext.scope &&
        doc.scopeContext.scopeId === scopeContext.scopeId
      ) {
        results.push(doc);
      }
    }

    return Object.freeze(results);
  }
}

import { TenantContext } from '../../identity/tenant-context';
import { KnowledgeDocument } from '../domain/knowledge-document';
import { MemoryScopeContext } from '../vo/memory-scope-context';

export interface KnowledgeRepositoryPort {
  saveDocument(
    tenantContext: Readonly<TenantContext>,
    document: Readonly<KnowledgeDocument>,
  ): Promise<void>;

  findDocumentById(
    tenantContext: Readonly<TenantContext>,
    knowledgeId: string,
  ): Promise<KnowledgeDocument | undefined>;

  findDocumentBySourceUri(
    tenantContext: Readonly<TenantContext>,
    scopeContext: Readonly<MemoryScopeContext>,
    sourceUri: string,
  ): Promise<KnowledgeDocument | undefined>;

  listDocumentsByScope(
    tenantContext: Readonly<TenantContext>,
    scopeContext: Readonly<MemoryScopeContext>,
  ): Promise<ReadonlyArray<KnowledgeDocument>>;
}

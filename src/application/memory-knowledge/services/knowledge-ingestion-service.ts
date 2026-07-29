import { createHash, randomUUID } from 'node:crypto';
import { TenantContext } from '../../identity/tenant-context';
import {
  KnowledgeDocument,
  KnowledgeProvenance,
  KnowledgeFreshnessPolicy,
  KnowledgeVersionSnapshot,
  KnowledgeSourceType,
} from '../domain/knowledge-document';
import { MemoryScopeContext } from '../vo/memory-scope-context';
import type { KnowledgeRepositoryPort } from '../ports/knowledge-repository-port';

export interface IngestDocumentCommand {
  readonly scopeContext: MemoryScopeContext;
  readonly sourceType: KnowledgeSourceType;
  readonly sourceUri: string;
  readonly title: string;
  readonly summary?: string | undefined;
  readonly content: string;
  readonly sourceAuthor?: string | undefined;
  readonly sourceSystem?: string | undefined;
  readonly licensing?: string | undefined;
  readonly ttlMs?: number | undefined;
}

export class KnowledgeIngestionService {
  constructor(private readonly knowledgeRepo: KnowledgeRepositoryPort) {}

  async ingestDocument(
    tenantContext: Readonly<TenantContext>,
    command: Readonly<IngestDocumentCommand>,
  ): Promise<KnowledgeDocument> {
    if (command.scopeContext.tenantId !== tenantContext.tenantId) {
      throw new Error(
        `[KnowledgeIngestionService] Security violation: Tenant '${tenantContext.tenantId}' cannot ingest document for tenant '${command.scopeContext.tenantId}'.`,
      );
    }

    const now = new Date();
    const checksum = createHash('sha256').update(command.content).digest('hex');
    const contentHash = `sha256-${checksum}`;

    // Simple paragraph chunking
    const chunks = command.content
      .split(/\n\s*\n/)
      .map((c) => c.trim())
      .filter((c) => c.length > 0);

    const versionSnapshot = new KnowledgeVersionSnapshot({
      versionId: `v-${randomUUID()}`,
      checksum: contentHash,
      contentHash,
      title: command.title,
      summary: command.summary,
      contentChunks: chunks.length > 0 ? chunks : [command.content],
      createdAt: now,
    });

    const provenance = new KnowledgeProvenance({
      sourceUri: command.sourceUri,
      ingestedAt: now,
      sourceAuthor: command.sourceAuthor,
      sourceSystem: command.sourceSystem,
      licensing: command.licensing,
    });

    const freshness = new KnowledgeFreshnessPolicy({
      ttlMs: command.ttlMs,
      lastValidatedAt: now,
      revalidationStatus: 'VALID',
    });

    // Check if document already exists for sourceUri under scope
    const existingDoc = await this.knowledgeRepo.findDocumentBySourceUri(
      tenantContext,
      command.scopeContext,
      command.sourceUri,
    );

    let targetDoc: KnowledgeDocument;
    if (existingDoc) {
      // Append immutable version snapshot if content changed
      const activeVersion = existingDoc.getActiveVersion();
      if (activeVersion.checksum === contentHash) {
        // Content unchanged: refresh validation timestamp
        targetDoc = existingDoc.withFreshness(freshness);
      } else {
        // Content changed: add new immutable snapshot
        targetDoc = existingDoc
          .addVersion(versionSnapshot)
          .withFreshness(freshness);
      }
    } else {
      // Create new KnowledgeDocument
      targetDoc = new KnowledgeDocument({
        knowledgeId: `doc-${randomUUID()}`,
        scopeContext: command.scopeContext,
        sourceType: command.sourceType,
        provenance,
        freshness,
        activeVersionId: versionSnapshot.versionId,
        versions: [versionSnapshot],
        createdAt: now,
        updatedAt: now,
      });
    }

    await this.knowledgeRepo.saveDocument(tenantContext, targetDoc);
    return targetDoc;
  }
}

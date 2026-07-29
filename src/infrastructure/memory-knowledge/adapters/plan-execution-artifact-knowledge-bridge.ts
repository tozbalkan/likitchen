import { TenantContext } from '../../../application/identity/tenant-context';
import { ArtifactReference } from '../../../application/planning-orchestration/vo/artifact-reference';
import { KnowledgeDocument } from '../../../application/memory-knowledge/domain/knowledge-document';
import { MemoryScopeContext } from '../../../application/memory-knowledge/vo/memory-scope-context';
import { KnowledgeIngestionService } from '../../../application/memory-knowledge/services/knowledge-ingestion-service';
import type { KnowledgeRepositoryPort } from '../../../application/memory-knowledge/ports/knowledge-repository-port';

export class PlanExecutionArtifactKnowledgeBridge {
  constructor(
    private readonly ingestionService: KnowledgeIngestionService,
    private readonly knowledgeRepo: KnowledgeRepositoryPort,
  ) {}

  async bridgeArtifactToKnowledge(
    tenantContext: Readonly<TenantContext>,
    planInstanceId: string,
    artifact: Readonly<ArtifactReference>,
  ): Promise<KnowledgeDocument> {
    const scopeContext = MemoryScopeContext.fromPlanInstance(
      tenantContext,
      planInstanceId,
    );

    const sourceUri = `artifact://${tenantContext.tenantId}/${planInstanceId}/${artifact.artifactId}/${artifact.producerNodeId}`;

    // 1. Initial Idempotency check: verify if artifact already ingested
    const existing = await this.knowledgeRepo.findDocumentBySourceUri(
      tenantContext,
      scopeContext,
      sourceUri,
    );

    if (existing) {
      return existing; // Fast-path idempotent return
    }

    // 2. Ingest artifact output as KnowledgeDocument
    await this.ingestionService.ingestDocument(tenantContext, {
      scopeContext,
      sourceType: 'EXECUTION_ARTIFACT',
      sourceUri,
      title: `Execution Artifact: ${artifact.name}`,
      summary: artifact.mimeType,
      content: artifact.uri, // URI / payload content reference
      sourceAuthor: `Capability-024 Node '${artifact.producerNodeId}'`,
      sourceSystem: 'PlanningOrchestration',
    });

    // 3. Re-query repository for authoritative single document instance (guarantees concurrent worker race safety)
    const authoritativeDoc = await this.knowledgeRepo.findDocumentBySourceUri(
      tenantContext,
      scopeContext,
      sourceUri,
    );

    if (!authoritativeDoc) {
      throw new Error(
        `[PlanExecutionArtifactKnowledgeBridge] Failed to resolve authoritative document for source URI '${sourceUri}'.`,
      );
    }

    return authoritativeDoc;
  }
}

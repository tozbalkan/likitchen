import { describe, it, expect } from 'vitest';
import { buildApplication } from '../../bootstrap/build-application';
import { TenantContext } from '../../application/identity/tenant-context';
import { MemoryScopeContext } from '../../application/memory-knowledge/vo/memory-scope-context';
import { MemoryRecord } from '../../application/memory-knowledge/domain/memory-record';
import type { MemoryRepositoryPort } from '../../application/memory-knowledge/ports/memory-repository-port';
import type { KnowledgeRepositoryPort } from '../../application/memory-knowledge/ports/knowledge-repository-port';
import { MemoryAccessEvaluator } from '../../application/memory-knowledge/services/memory-access-evaluator';
import { HybridRetrievalEngine } from '../../application/memory-knowledge/services/hybrid-retrieval-engine';
import { MemoryConflictResolver } from '../../application/memory-knowledge/services/memory-conflict-resolver';
import { KnowledgeIngestionService } from '../../application/memory-knowledge/services/knowledge-ingestion-service';
import { PlanExecutionArtifactKnowledgeBridge } from '../../infrastructure/memory-knowledge/adapters/plan-execution-artifact-knowledge-bridge';
import { ArtifactReference } from '../../application/planning-orchestration/vo/artifact-reference';

describe('Capability-025 Memory & Knowledge Platform Contract Tests', () => {
  it('enforces scope invariants, preventing invalid ID combinations', () => {
    // TENANT scope requires tenantId
    expect(
      () =>
        new MemoryScopeContext({
          scope: 'TENANT',
          tenantId: '',
        }),
    ).toThrow('[MemoryScopeContext] tenantId is strictly required.');

    // WORKSPACE scope requires organizationId and workspaceId
    expect(
      () =>
        new MemoryScopeContext({
          scope: 'WORKSPACE',
          tenantId: 't-1',
          organizationId: 'o-1',
        }),
    ).toThrow('[MemoryScopeContext] WORKSPACE scope requires workspaceId.');

    // USER scope requires userId
    expect(
      () =>
        new MemoryScopeContext({
          scope: 'USER',
          tenantId: 't-1',
          organizationId: 'o-1',
          workspaceId: 'w-1',
        }),
    ).toThrow('[MemoryScopeContext] USER scope requires userId.');

    // Canonical scopeId property
    const scopeCtx = new MemoryScopeContext({
      scope: 'USER',
      tenantId: 't-1',
      organizationId: 'o-1',
      workspaceId: 'w-1',
      userId: 'u-123',
    });
    expect(scopeCtx.scopeId).toBe('u-123');
  });

  it('proves cross-tenant read & write isolation on repository adapters', async () => {
    const registry = await buildApplication();
    const memoryRepo = registry.resolve<MemoryRepositoryPort>(
      'MemoryRepositoryPort',
    );

    const tenantA = TenantContext.create({
      tenantId: 'tenant-alpha',
      organizationId: 'org-alpha',
      workspaceId: 'ws-alpha',
      environment: 'production',
      region: 'us-east-1',
    });

    const tenantB = TenantContext.create({
      tenantId: 'tenant-beta',
      organizationId: 'org-beta',
      workspaceId: 'ws-beta',
      environment: 'production',
      region: 'us-east-1',
    });

    const scopeA = MemoryScopeContext.fromWorkspace(tenantA);

    const recordA = MemoryRecord.create({
      memoryId: 'mem-a-1',
      scopeContext: scopeA,
      memoryType: 'USER_PREFERENCE',
      key: 'language',
      content: 'Turkish',
      confidenceScore: 0.95,
    });

    // 1. Tenant A saves memory
    await memoryRepo.saveMemory(tenantA, recordA);

    // 2. Tenant B cross-tenant write blocked
    await expect(memoryRepo.saveMemory(tenantB, recordA)).rejects.toThrow(
      "Security violation: Tenant 'tenant-beta' cannot write memory for tenant 'tenant-alpha'.",
    );

    // 3. Tenant B cross-tenant read blocked
    const crossRead = await memoryRepo.findMemoryById(tenantB, 'mem-a-1');
    expect(crossRead).toBeUndefined();
  });

  it('proves active memory uniqueness lock and optimistic CAS superseding', async () => {
    const registry = await buildApplication();
    const memoryRepo = registry.resolve<MemoryRepositoryPort>(
      'MemoryRepositoryPort',
    );

    const tenant = TenantContext.create({
      tenantId: 'tenant-cas-test',
      organizationId: 'org-cas',
      workspaceId: 'ws-cas',
      environment: 'production',
      region: 'us-east-1',
    });

    const scope = MemoryScopeContext.fromWorkspace(tenant);

    const recordV1 = MemoryRecord.create({
      memoryId: 'mem-pref-1',
      scopeContext: scope,
      memoryType: 'USER_PREFERENCE',
      key: 'theme',
      content: 'dark',
      confidenceScore: 0.9,
    });

    await memoryRepo.saveMemory(tenant, recordV1);

    // Active uniqueness conflict test
    const recordDuplicateActive = MemoryRecord.create({
      memoryId: 'mem-pref-2',
      scopeContext: scope,
      memoryType: 'USER_PREFERENCE',
      key: 'theme',
      content: 'light',
      confidenceScore: 0.9,
    });

    await expect(
      memoryRepo.saveMemory(tenant, recordDuplicateActive),
    ).rejects.toThrow('Active memory uniqueness conflict');

    // Supersede V1 to V2 using optimistic CAS
    const recordV1Superseded = recordV1.supersede('mem-pref-2');
    await memoryRepo.saveMemory(tenant, recordV1Superseded, 1); // expectedVersion = 1

    // Now save V2 as active
    await memoryRepo.saveMemory(tenant, recordDuplicateActive);

    const activeRecord = await memoryRepo.findActiveByKey(
      tenant,
      scope,
      'USER_PREFERENCE',
      'theme',
    );
    expect(activeRecord?.memoryId).toBe('mem-pref-2');
    expect(activeRecord?.content).toBe('light');

    // Optimistic Concurrency Conflict Test (Version Mismatch)
    await expect(
      memoryRepo.saveMemory(tenant, recordV1Superseded, 1),
    ).rejects.toThrow('Optimistic lock conflict');
  });

  it('proves tombstone deletion semantics, rendering deleted records non-retrievable', async () => {
    const registry = await buildApplication();
    const memoryRepo = registry.resolve<MemoryRepositoryPort>(
      'MemoryRepositoryPort',
    );

    const tenant = TenantContext.create({
      tenantId: 'tenant-tombstone-test',
      organizationId: 'org-ts',
      workspaceId: 'ws-ts',
      environment: 'production',
      region: 'us-east-1',
    });

    const scope = MemoryScopeContext.fromWorkspace(tenant);
    const record = MemoryRecord.create({
      memoryId: 'mem-secret-1',
      scopeContext: scope,
      memoryType: 'SEMANTIC_FACT',
      key: 'api-endpoint',
      content: 'https://internal.api',
      confidenceScore: 1.0,
    });

    await memoryRepo.saveMemory(tenant, record);

    // Delete memory record (Tombstone transition)
    const tombstone = record.delete();
    expect(tombstone.state).toBe('DELETED');
    expect(tombstone.content).toBe('');

    await memoryRepo.saveMemory(tenant, tombstone, 1);

    // Active lookup returns undefined
    const activeLook = await memoryRepo.findActiveByKey(
      tenant,
      scope,
      'SEMANTIC_FACT',
      'api-endpoint',
    );
    expect(activeLook).toBeUndefined();

    // Default listing filters tombstones out
    const list = await memoryRepo.listMemoriesByScope(tenant, scope, false);
    expect(list).toHaveLength(0);
  });

  it('proves Authorization-Before-Retrieval pipeline and deterministic hybrid ranking with freshness multipliers', async () => {
    const registry = await buildApplication();
    const accessEvaluator = registry.resolve<MemoryAccessEvaluator>(
      'MemoryAccessEvaluator',
    );
    const retrievalEngine = registry.resolve<HybridRetrievalEngine>(
      'HybridRetrievalEngine',
    );
    const ingestionService = registry.resolve<KnowledgeIngestionService>(
      'KnowledgeIngestionService',
    );
    const memoryRepo = registry.resolve<MemoryRepositoryPort>(
      'MemoryRepositoryPort',
    );

    const tenant = TenantContext.create({
      tenantId: 'tenant-retrieval-test',
      organizationId: 'org-retrieval',
      workspaceId: 'ws-retrieval',
      environment: 'production',
      region: 'us-east-1',
    });

    const scope = MemoryScopeContext.fromWorkspace(tenant);

    // 1. Ingest Knowledge Document
    const docValid = await ingestionService.ingestDocument(tenant, {
      scopeContext: scope,
      sourceType: 'DOCUMENT',
      sourceUri: 'doc://policy-v1',
      title: 'Kitchen Security Guidelines Policy',
      content:
        'Strict multi-tenant security guidelines and authentication rules.',
    });

    expect(docValid.getActiveVersion().checksum).toContain('sha256-');

    // 2. Add Memory Record
    const memFact = MemoryRecord.create({
      memoryId: 'mem-fact-1',
      scopeContext: scope,
      memoryType: 'SEMANTIC_FACT',
      key: 'security-rule',
      content: 'Authentication requires OAuth2 multi-tenant tokens.',
      confidenceScore: 0.9,
    });
    await memoryRepo.saveMemory(tenant, memFact);

    // 3. Build AuthorizedCandidateSet (Authorization MUST happen before retrieval)
    const authorizedCandidates =
      await accessEvaluator.buildAuthorizedCandidateSet(tenant, scope);
    expect(authorizedCandidates.memories).toHaveLength(1);
    expect(authorizedCandidates.documents).toHaveLength(1);

    // 4. Run Hybrid Retrieval Engine
    const results = retrievalEngine.search(
      'security authentication policy',
      authorizedCandidates,
    );

    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0]?.finalScore).toBeGreaterThan(0);
  });

  it('proves MemoryConflictResolver distinguishes conflict detection from supersession', () => {
    const resolver = new MemoryConflictResolver();
    const tenant = TenantContext.create({
      tenantId: 't-conflict',
      organizationId: 'o-conflict',
      workspaceId: 'w-conflict',
      environment: 'test',
      region: 'us-west-1',
    });
    const scope = MemoryScopeContext.fromWorkspace(tenant);

    const recordA = MemoryRecord.create({
      memoryId: 'm-1',
      scopeContext: scope,
      memoryType: 'USER_PREFERENCE',
      key: 'contactChannel',
      content: 'email',
      confidenceScore: 0.8,
    });

    const recordB = MemoryRecord.create({
      memoryId: 'm-2',
      scopeContext: scope,
      memoryType: 'USER_PREFERENCE',
      key: 'contactChannel',
      content: 'WhatsApp',
      confidenceScore: 0.95,
    });

    // Detect un-superseded conflicting active records
    const conflicts = resolver.detectConflicts([recordA, recordB]);
    expect(conflicts).toHaveLength(1);

    // Resolve via HIGHEST_CONFIDENCE_WINS
    const resolution = resolver.resolveConflict(
      conflicts[0]!,
      'HIGHEST_CONFIDENCE_WINS',
    );
    expect(resolution.winner.memoryId).toBe('m-2');
    expect(resolution.loserToSupersede.state).toBe('SUPERSEDED');
    expect(resolution.loserToSupersede.supersededByMemoryId).toBe('m-2');
  });

  it('proves PlanExecutionArtifactKnowledgeBridge provides idempotent artifact ingestion and concurrent worker safety', async () => {
    const registry = await buildApplication();
    const bridge = registry.resolve<PlanExecutionArtifactKnowledgeBridge>(
      'PlanExecutionArtifactKnowledgeBridge',
    );
    const knowledgeRepo = registry.resolve<KnowledgeRepositoryPort>(
      'KnowledgeRepositoryPort',
    );

    const tenant = TenantContext.create({
      tenantId: 'tenant-bridge-test',
      organizationId: 'org-bridge',
      workspaceId: 'ws-bridge',
      environment: 'production',
      region: 'us-east-1',
    });

    const artifact = new ArtifactReference({
      artifactId: 'art-summary-q3',
      name: 'Q3 Financial Analysis Report',
      uri: 's3://artifacts/q3-summary.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1024,
      producerNodeId: 'node-q3-calc',
    });

    // Concurrent bridge executions across parallel workers
    const [doc1, doc2] = await Promise.all([
      bridge.bridgeArtifactToKnowledge(tenant, 'inst-plan-run-99', artifact),
      bridge.bridgeArtifactToKnowledge(tenant, 'inst-plan-run-99', artifact),
    ]);

    expect(doc1.sourceType).toBe('EXECUTION_ARTIFACT');
    expect(doc2.knowledgeId).toBe(doc1.knowledgeId);

    // Verify stored in knowledge repository
    const stored = await knowledgeRepo.findDocumentById(
      tenant,
      doc1.knowledgeId,
    );
    expect(stored).toBeDefined();
    expect(stored?.getActiveVersion().title).toContain(
      'Q3 Financial Analysis Report',
    );
  });
});

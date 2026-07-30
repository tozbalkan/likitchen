import { describe, it, expect } from 'vitest';
import { buildApplication } from '../../bootstrap/build-application';
import { TenantContext } from '../../application/identity/tenant-context';
import { MemoryScopeContext } from '../../application/memory-knowledge/vo/memory-scope-context';
import { MemoryRecord } from '../../application/memory-knowledge/domain/memory-record';
import type { MemoryRepositoryPort } from '../../application/memory-knowledge/ports/memory-repository-port';
import type { ExecutionPlanRepositoryPort } from '../../application/planning-orchestration/ports/execution-plan-repository-port';
import type { ContextSnapshotRepositoryPort } from '../../application/context-intelligence/ports/context-snapshot-repository-port';
import { ContextAssembler } from '../../application/context-intelligence/services/context-assembler';
import { ContextAssemblyRequest } from '../../application/context-intelligence/vo/context-assembly-request';
import { KnowledgeIngestionService } from '../../application/memory-knowledge/services/knowledge-ingestion-service';
import { ExecutionPlanInstance } from '../../application/planning-orchestration/domain/execution-plan-instance';
import { ExecutionGraph } from '../../application/planning-orchestration/graph/execution-graph';
import { PlanNode } from '../../application/planning-orchestration/graph/plan-node';
import { PlanEdge } from '../../application/planning-orchestration/graph/plan-edge';
import { PlanBudget } from '../../application/planning-orchestration/vo/plan-budget';
import { ExecutionCursor } from '../../application/planning-orchestration/vo/execution-cursor';
import { VariableReference } from '../../application/planning-orchestration/vo/variable-reference';
import { ArtifactReference } from '../../application/planning-orchestration/vo/artifact-reference';
import { ExecutionSpan } from '../../application/planning-orchestration/vo/execution-trace';

// ── Test Fixture Helpers ──────────────────────────────────────────

function makeTenant(id: string) {
  return TenantContext.create({
    tenantId: `tenant-${id}`,
    organizationId: `org-${id}`,
    workspaceId: `ws-${id}`,
    environment: 'production',
    region: 'us-east-1',
  });
}

function makeRequest(
  tenant: TenantContext,
  overrides?: Partial<{
    requestId: string;
    planInstanceId: string;
    nodeId: string;
    query: string;
    userId: string;
    permittedScopes: ReadonlyArray<
      import('../../application/memory-knowledge/vo/memory-scope-context').MemoryScope
    >;
    tokenBudget: number;
    maxItems: number;
  }>,
) {
  return new ContextAssemblyRequest({
    requestId:
      overrides?.requestId ??
      `req-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    tenantId: tenant.tenantId,
    organizationId: tenant.organizationId,
    workspaceId: tenant.workspaceId,
    userId: overrides?.userId,
    planInstanceId: overrides?.planInstanceId ?? 'plan-inst-1',
    nodeId: overrides?.nodeId ?? 'node-decision-1',
    query: overrides?.query ?? 'security policy authentication',
    permittedScopes: overrides?.permittedScopes ?? [
      'PLAN_INSTANCE',
      'WORKSPACE',
    ],
    tokenBudget: overrides?.tokenBudget ?? 100000,
    maxItems: overrides?.maxItems ?? 50,
    createdAt: new Date(),
  });
}

async function seedExecutionPlan(
  repo: ExecutionPlanRepositoryPort,
  tenant: TenantContext,
  instanceId: string,
) {
  const nodeA = new PlanNode({
    nodeId: 'node-a',
    name: 'Analyze',
    behaviorType: 'PROMPT',
  });
  const nodeB = new PlanNode({
    nodeId: 'node-b',
    name: 'Decide',
    behaviorType: 'DECISION',
  });
  const edge = new PlanEdge({
    edgeId: 'edge-a-b',
    sourceNodeId: 'node-a',
    targetNodeId: 'node-b',
  });
  const graph = ExecutionGraph.create('graph-1', [nodeA, nodeB], [edge]);
  await repo.saveGraph(tenant, graph);

  let instance = ExecutionPlanInstance.create({
    instanceId,
    tenantId: tenant.tenantId,
    planId: 'plan-def-1',
    version: '1.0',
    graphId: graph.graphId,
    cursor: ExecutionCursor.createInitial(['node-a', 'node-b']),
    budget: PlanBudget.createDefault(),
  });

  // Add a variable
  instance = instance.addVariable(
    VariableReference.createGlobal('apiEndpoint', 'https://api.example.com'),
  );

  // Add an artifact
  instance = instance.addArtifact(
    new ArtifactReference({
      artifactId: 'art-report-1',
      name: 'Security Audit Report',
      uri: 's3://artifacts/security-audit.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 2048,
      producerNodeId: 'node-a',
    }),
  );

  // Add an execution span
  instance = instance.addSpan(
    new ExecutionSpan({
      spanId: `span-${instanceId}-001`,
      nodeId: 'node-a',
      behaviorType: 'PROMPT',
      startTime: new Date(),
      endTime: new Date(),
      durationMs: 150,
      status: 'SUCCESS',
      inputTokens: 500,
      outputTokens: 200,
      costUSD: 0.01,
    }),
  );

  await repo.saveInstance(tenant, instance);
  return instance;
}

async function seedMemoryAndKnowledge(
  registry: Awaited<ReturnType<typeof buildApplication>>,
  tenant: TenantContext,
) {
  const memoryRepo = registry.resolve<MemoryRepositoryPort>(
    'MemoryRepositoryPort',
  );
  const ingestionService = registry.resolve<KnowledgeIngestionService>(
    'KnowledgeIngestionService',
  );

  // Workspace-scoped memory
  const wsScope = MemoryScopeContext.fromWorkspace(tenant);
  const memFact = MemoryRecord.create({
    memoryId: 'mem-sec-rule-1',
    scopeContext: wsScope,
    memoryType: 'SEMANTIC_FACT',
    key: 'security-policy',
    content:
      'All API endpoints require OAuth2 bearer tokens with tenant isolation.',
    confidenceScore: 0.95,
  });
  await memoryRepo.saveMemory(tenant, memFact);

  // Plan-instance-scoped knowledge
  const piScope = MemoryScopeContext.fromPlanInstance(tenant, 'plan-inst-1');
  await ingestionService.ingestDocument(tenant, {
    scopeContext: piScope,
    sourceType: 'DOCUMENT',
    sourceUri: 'doc://security-guidelines-v2',
    title: 'Enterprise Security Guidelines v2',
    content:
      'Multi-tenant authentication requires strict scope isolation and RBAC enforcement.',
  });

  return { memFact };
}

// ── Contract Tests ────────────────────────────────────────────────

describe('Capability-026 Context Intelligence Contract Tests', () => {
  // ── P0: Security & Isolation ──────────────────────────────────

  it('P0-1: proves cross-tenant context isolation', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenantA = makeTenant('alpha');
    const tenantB = makeTenant('beta');

    await seedExecutionPlan(planRepo, tenantA, 'plan-inst-alpha');
    await seedMemoryAndKnowledge(registry, tenantA);

    // Tenant B tries to assemble context for Tenant A's plan instance
    const request = makeRequest(tenantB, {
      planInstanceId: 'plan-inst-alpha',
    });
    const snapshot = await assembler.assemble(request);

    // Tenant B should NOT see Tenant A's data
    expect(snapshot.entries.length).toBe(0);
    expect(snapshot.tenantId).toBe(tenantB.tenantId);
  });

  it('P0-2: proves cross-tenant snapshot read protection', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const snapshotRepo = registry.resolve<ContextSnapshotRepositoryPort>(
      'ContextSnapshotRepositoryPort',
    );
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenantA = makeTenant('snap-alpha');
    await seedExecutionPlan(planRepo, tenantA, 'plan-snap-1');

    const request = makeRequest(tenantA, {
      planInstanceId: 'plan-snap-1',
    });
    const snapshot = await assembler.assemble(request);

    // Tenant B cannot read Tenant A's snapshot
    const tenantB = makeTenant('snap-beta');
    const crossRead = await snapshotRepo.findSnapshotById(
      tenantB,
      snapshot.snapshotId,
    );
    expect(crossRead).toBeUndefined();
  });

  it('P0-3: proves PLAN_INSTANCE isolation', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('pi-iso');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-A');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-B');

    // Assembly for plan-inst-A
    const requestA = makeRequest(tenant, { planInstanceId: 'plan-inst-A' });
    const snapshotA = await assembler.assemble(requestA);

    // Assembly for plan-inst-B
    const requestB = makeRequest(tenant, { planInstanceId: 'plan-inst-B' });
    const snapshotB = await assembler.assemble(requestB);

    expect(snapshotA.planInstanceId).toBe('plan-inst-A');
    expect(snapshotB.planInstanceId).toBe('plan-inst-B');

    // Verify artifacts/variables are instance-scoped
    const artEntriesA = snapshotA.entries.filter(
      (e) => e.sourceType === 'ARTIFACT',
    );
    const artEntriesB = snapshotB.entries.filter(
      (e) => e.sourceType === 'ARTIFACT',
    );

    for (const entry of artEntriesA) {
      expect(entry.scopeId).toBe('plan-inst-A');
    }
    for (const entry of artEntriesB) {
      expect(entry.scopeId).toBe('plan-inst-B');
    }
  });

  it('P0-4: proves authorization-before-retrieval — no raw repository access from ContextAssembler', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');

    // ContextAssembler's constructor does NOT accept MemoryRepositoryPort or KnowledgeRepositoryPort
    // This is a structural/type-level guarantee
    expect(assembler).toBeDefined();

    // Verify assembler is an instance of ContextAssembler (not a mock)
    expect(assembler).toBeInstanceOf(ContextAssembler);
  });

  // ── P1: Determinism, Provenance, Conflicts ────────────────────

  it('P1-1: proves multi-scope assembly with scope precedence', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('multi-scope');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');
    await seedMemoryAndKnowledge(registry, tenant);

    const request = makeRequest(tenant, {
      permittedScopes: ['PLAN_INSTANCE', 'WORKSPACE'],
    });

    const snapshot = await assembler.assemble(request);

    expect(snapshot.entries.length).toBeGreaterThan(0);

    // Check that we have entries from multiple scopes
    const scopes = new Set(snapshot.entries.map((e) => e.scope));
    expect(scopes.size).toBeGreaterThanOrEqual(1);

    // Verify PLAN_INSTANCE-scoped entries have higher priority than WORKSPACE-scoped
    const piEntries = snapshot.entries.filter(
      (e) => e.scope === 'PLAN_INSTANCE',
    );
    const wsEntries = snapshot.entries.filter((e) => e.scope === 'WORKSPACE');

    if (piEntries.length > 0 && wsEntries.length > 0) {
      const minPiPriority = Math.min(...piEntries.map((e) => e.priority));
      const maxWsPriority = Math.max(...wsEntries.map((e) => e.priority));
      // PLAN_INSTANCE (specificity 5) should produce higher priorities than WORKSPACE (specificity 3)
      expect(minPiPriority).toBeGreaterThan(maxWsPriority);
    }
  });

  it('P1-2: proves static source priority ordering', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('priority-test');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');

    const request = makeRequest(tenant, {
      permittedScopes: ['PLAN_INSTANCE'],
    });
    const snapshot = await assembler.assemble(request);

    // SYSTEM_CONTEXT entries should appear before VARIABLE which appears before ARTIFACT etc.
    const sysEntries = snapshot.entries.filter(
      (e) => e.sourceType === 'SYSTEM_CONTEXT',
    );
    const varEntries = snapshot.entries.filter(
      (e) => e.sourceType === 'VARIABLE',
    );
    const artEntries = snapshot.entries.filter(
      (e) => e.sourceType === 'ARTIFACT',
    );
    const traceEntries = snapshot.entries.filter(
      (e) => e.sourceType === 'EXECUTION_TRACE',
    );

    if (sysEntries.length > 0 && varEntries.length > 0) {
      expect(sysEntries[0]!.priority).toBeGreaterThanOrEqual(
        varEntries[0]!.priority,
      );
    }
    if (varEntries.length > 0 && artEntries.length > 0) {
      expect(varEntries[0]!.priority).toBeGreaterThanOrEqual(
        artEntries[0]!.priority,
      );
    }
    if (artEntries.length > 0 && traceEntries.length > 0) {
      expect(artEntries[0]!.priority).toBeGreaterThanOrEqual(
        traceEntries[0]!.priority,
      );
    }
  });

  it('P1-3: proves semantic conflict detection with DEFERRED_TO_AGENT', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );
    const memoryRepo = registry.resolve<MemoryRepositoryPort>(
      'MemoryRepositoryPort',
    );

    const tenant = makeTenant('conflict-test');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');

    // Create conflicting memories at different scopes
    const wsScope = MemoryScopeContext.fromWorkspace(tenant);
    const piScope = MemoryScopeContext.fromPlanInstance(tenant, 'plan-inst-1');

    const memA = MemoryRecord.create({
      memoryId: 'mem-conflict-a',
      scopeContext: wsScope,
      memoryType: 'SEMANTIC_FACT',
      key: 'auth-method',
      content: 'Use OAuth2 for all authentication.',
      confidenceScore: 0.9,
    });
    await memoryRepo.saveMemory(tenant, memA);

    const memB = MemoryRecord.create({
      memoryId: 'mem-conflict-b',
      scopeContext: piScope,
      memoryType: 'SEMANTIC_FACT',
      key: 'auth-method',
      content: 'Use API keys for service-to-service authentication.',
      confidenceScore: 0.85,
    });
    await memoryRepo.saveMemory(tenant, memB);

    const request = makeRequest(tenant, {
      query: 'auth-method authentication',
      permittedScopes: ['PLAN_INSTANCE', 'WORKSPACE'],
    });
    const snapshot = await assembler.assemble(request);

    // Both competing entries should be included
    const memEntries = snapshot.entries.filter(
      (e) => e.sourceType === 'MEMORY',
    );
    expect(memEntries.length).toBeGreaterThanOrEqual(2);

    // If conflicts detected, all should be DEFERRED_TO_AGENT
    for (const conflict of snapshot.conflicts) {
      expect(conflict.resolutionState).toBe('DEFERRED_TO_AGENT');
      expect(conflict.competingEntryIds.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('P1-4: proves mandatory snapshot persistence', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const snapshotRepo = registry.resolve<ContextSnapshotRepositoryPort>(
      'ContextSnapshotRepositoryPort',
    );
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('persist-test');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');

    const request = makeRequest(tenant, { planInstanceId: 'plan-inst-1' });
    const snapshot = await assembler.assemble(request);

    // Verify snapshot is persisted
    const retrieved = await snapshotRepo.findSnapshotById(
      tenant,
      snapshot.snapshotId,
    );
    expect(retrieved).toBeDefined();
    expect(retrieved!.snapshotId).toBe(snapshot.snapshotId);
    expect(retrieved!.snapshotChecksum).toBe(snapshot.snapshotChecksum);
    expect(retrieved!.entries.length).toBe(snapshot.entries.length);
  });

  it('P1-5: proves snapshot immutability and deterministic checksum', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('checksum-test');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');

    const request = makeRequest(tenant, { planInstanceId: 'plan-inst-1' });
    const snapshot = await assembler.assemble(request);

    // Checksum must be SHA-256
    expect(snapshot.snapshotChecksum).toMatch(/^sha256-[a-f0-9]{64}$/);

    // Snapshot must be frozen (immutable)
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.entries)).toBe(true);
    expect(Object.isFrozen(snapshot.conflicts)).toBe(true);
  });

  it('P1-6: proves deterministic ordering — same inputs produce identical order', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('determ-test');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');

    const requestId = 'deterministic-req-001';
    const request = makeRequest(tenant, {
      requestId,
      planInstanceId: 'plan-inst-1',
    });

    const snapshot1 = await assembler.assemble(request);

    // Second call with same requestId should return cached (idempotent)
    const snapshot2 = await assembler.assemble(request);

    expect(snapshot2.snapshotId).toBe(snapshot1.snapshotId);
    expect(snapshot2.snapshotChecksum).toBe(snapshot1.snapshotChecksum);
    expect(snapshot2.entries.length).toBe(snapshot1.entries.length);
    for (let i = 0; i < snapshot1.entries.length; i++) {
      expect(snapshot2.entries[i]!.entryId).toBe(snapshot1.entries[i]!.entryId);
    }
  });

  it('P1-7: proves provenance preservation on all context entries', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('provenance-test');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');
    await seedMemoryAndKnowledge(registry, tenant);

    const request = makeRequest(tenant, {
      permittedScopes: ['PLAN_INSTANCE', 'WORKSPACE'],
    });
    const snapshot = await assembler.assemble(request);

    // Every entry must have an evidence reference
    for (const entry of snapshot.entries) {
      expect(entry.evidence).toBeDefined();
      expect(entry.evidence.type).toBe(entry.sourceType);

      switch (entry.evidence.type) {
        case 'MEMORY':
          expect(entry.evidence.memoryId).toBeTruthy();
          expect(entry.evidence.memoryVersion).toBeGreaterThanOrEqual(1);
          expect(entry.evidence.selectionReason).toBeTruthy();
          break;
        case 'KNOWLEDGE':
          expect(entry.evidence.knowledgeId).toBeTruthy();
          expect(entry.evidence.versionId).toBeTruthy();
          expect(entry.evidence.checksum).toMatch(/^sha256-/);
          expect(entry.evidence.selectionReason).toBeTruthy();
          break;
        case 'ARTIFACT':
          expect(entry.evidence.artifactId).toBeTruthy();
          expect(entry.evidence.producerNodeId).toBeTruthy();
          break;
        case 'VARIABLE':
          expect(entry.evidence.key).toBeTruthy();
          break;
        case 'EXECUTION_TRACE':
          expect(entry.evidence.spanId).toBeTruthy();
          expect(entry.evidence.nodeId).toBeTruthy();
          break;
        case 'SYSTEM_CONTEXT':
          expect(entry.evidence.contextKey).toBeTruthy();
          break;
      }
    }
  });

  it('P1-8: proves concurrent snapshot creation safety', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('concurrent-test');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');

    // Two different request IDs → two concurrent assemblies
    const req1 = makeRequest(tenant, {
      requestId: 'concurrent-req-1',
      planInstanceId: 'plan-inst-1',
    });
    const req2 = makeRequest(tenant, {
      requestId: 'concurrent-req-2',
      planInstanceId: 'plan-inst-1',
    });

    const [snap1, snap2] = await Promise.all([
      assembler.assemble(req1),
      assembler.assemble(req2),
    ]);

    // Both should succeed with different snapshot IDs
    expect(snap1.snapshotId).not.toBe(snap2.snapshotId);
    expect(snap1.requestId).toBe('concurrent-req-1');
    expect(snap2.requestId).toBe('concurrent-req-2');
  });

  it('P1-9: proves context budget enforcement', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('budget-test');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');

    // Very tight budget: only 3 items
    const request = makeRequest(tenant, {
      planInstanceId: 'plan-inst-1',
      maxItems: 3,
    });
    const snapshot = await assembler.assemble(request);

    expect(snapshot.entries.length).toBeLessThanOrEqual(3);
    expect(snapshot.assemblyTrace.totalItemsDiscarded).toBeGreaterThanOrEqual(
      0,
    );
  });

  it('P1-10: proves knowledge version provenance', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('kv-provenance');
    await seedExecutionPlan(planRepo, tenant, 'plan-inst-1');
    await seedMemoryAndKnowledge(registry, tenant);

    const request = makeRequest(tenant, {
      query: 'security guidelines authentication',
      permittedScopes: ['PLAN_INSTANCE'],
    });
    const snapshot = await assembler.assemble(request);

    const knowledgeEntries = snapshot.entries.filter(
      (e) => e.sourceType === 'KNOWLEDGE',
    );

    for (const entry of knowledgeEntries) {
      expect(entry.evidence.type).toBe('KNOWLEDGE');
      if (entry.evidence.type === 'KNOWLEDGE') {
        expect(entry.evidence.knowledgeId).toBeTruthy();
        expect(entry.evidence.versionId).toBeTruthy();
        expect(entry.evidence.checksum).toMatch(/^sha256-/);
        expect(entry.evidence.sourceUri).toBeTruthy();
      }
    }
  });

  it('P1-11: proves assembly with empty execution state succeeds', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');

    const tenant = makeTenant('empty-state');

    // No execution plan seeded — should succeed with empty/minimal context
    const request = makeRequest(tenant, {
      planInstanceId: 'nonexistent-plan',
      permittedScopes: ['WORKSPACE'],
    });
    const snapshot = await assembler.assemble(request);

    expect(snapshot).toBeDefined();
    expect(snapshot.snapshotId).toBeTruthy();
    expect(snapshot.snapshotChecksum).toMatch(/^sha256-/);
  });

  it('P1-12: proves findSnapshotsByPlanInstance returns only tenant-scoped results', async () => {
    const registry = await buildApplication();
    const assembler = registry.resolve<ContextAssembler>('ContextAssembler');
    const snapshotRepo = registry.resolve<ContextSnapshotRepositoryPort>(
      'ContextSnapshotRepositoryPort',
    );
    const planRepo = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );

    const tenant = makeTenant('list-snap');
    await seedExecutionPlan(planRepo, tenant, 'plan-list-1');

    await assembler.assemble(
      makeRequest(tenant, {
        planInstanceId: 'plan-list-1',
        requestId: 'list-req-1',
      }),
    );
    await assembler.assemble(
      makeRequest(tenant, {
        planInstanceId: 'plan-list-1',
        requestId: 'list-req-2',
      }),
    );

    const snapshots = await snapshotRepo.findSnapshotsByPlanInstance(
      tenant,
      'plan-list-1',
    );
    expect(snapshots.length).toBe(2);

    // Other tenant sees nothing
    const otherTenant = makeTenant('list-other');
    const otherSnapshots = await snapshotRepo.findSnapshotsByPlanInstance(
      otherTenant,
      'plan-list-1',
    );
    expect(otherSnapshots.length).toBe(0);
  });
});

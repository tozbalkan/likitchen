import { describe, it, expect } from 'vitest';
import { InMemoryExecutionPlanRepositoryAdapter } from './in-memory-execution-plan-repository';
import { TenantContext } from '../../application/identity/tenant-context';
import { CreatePlanDefinitionCommandHandler } from '../../application/planning-orchestration/commands/create-plan-definition.command';
import { CreatePlanVersionCommandHandler } from '../../application/planning-orchestration/commands/create-plan-version.command';
import { GetPlanDefinitionQueryHandler } from '../../application/planning-orchestration/queries/get-plan-definition.query';
import { GetPlanInstanceQueryHandler } from '../../application/planning-orchestration/queries/get-plan-instance.query';
import { PlanNode } from '../../application/planning-orchestration/graph/plan-node';
import { PlanEdge } from '../../application/planning-orchestration/graph/plan-edge';
import { ExecutionPlanInstance } from '../../application/planning-orchestration/domain/execution-plan-instance';
import { ExecutionCursor } from '../../application/planning-orchestration/vo/execution-cursor';

describe('Phase 1 — Three-Tier Plan Model, Immutable ExecutionGraph & CQRS Projections', () => {
  const repository = new InMemoryExecutionPlanRepositoryAdapter();
  const createDefHandler = new CreatePlanDefinitionCommandHandler(repository);
  const createVersionHandler = new CreatePlanVersionCommandHandler(repository);
  const getDefHandler = new GetPlanDefinitionQueryHandler(repository);
  const getInstanceHandler = new GetPlanInstanceQueryHandler(repository);

  const tenant = TenantContext.create({
    tenantId: 'tenant-plan-p1',
    organizationId: 'org-p1',
    workspaceId: 'ws-p1',
    environment: 'test',
    region: 'us-east-1',
  });

  it('creates plan definition, computes graph checksums, handles versioning, and validates topological parallel tiering', async () => {
    // 1. Define Nodes & Edges
    const nodeA = new PlanNode({
      nodeId: 'node-A',
      name: 'Start Task',
      behaviorType: 'PROMPT',
    });
    const nodeB = new PlanNode({
      nodeId: 'node-B',
      name: 'Parallel Tool 1',
      behaviorType: 'TOOL',
    });
    const nodeC = new PlanNode({
      nodeId: 'node-C',
      name: 'Parallel Tool 2',
      behaviorType: 'TOOL',
    });
    const nodeD = new PlanNode({
      nodeId: 'node-D',
      name: 'Merge Approval',
      behaviorType: 'APPROVAL',
    });

    const edges = [
      new PlanEdge({
        edgeId: 'e1',
        sourceNodeId: 'node-A',
        targetNodeId: 'node-B',
      }),
      new PlanEdge({
        edgeId: 'e2',
        sourceNodeId: 'node-A',
        targetNodeId: 'node-C',
      }),
      new PlanEdge({
        edgeId: 'e3',
        sourceNodeId: 'node-B',
        targetNodeId: 'node-D',
      }),
      new PlanEdge({
        edgeId: 'e4',
        sourceNodeId: 'node-C',
        targetNodeId: 'node-D',
      }),
    ];

    // 2. Create Plan Definition Command
    const def = await createDefHandler.execute({
      planId: 'plan-data-pipeline',
      name: 'ETL Data Pipeline Plan',
      description: 'Orchestrates data extraction and prompt summary',
      owner: 'alice-data-lead',
      version: '1.0.0',
      nodes: [nodeA, nodeB, nodeC, nodeD],
      edges,
      tenantContext: tenant,
    });

    expect(def.name).toBe('ETL Data Pipeline Plan');
    expect(def.versions).toHaveLength(1);

    // 3. Verify Graph SHA-256 Checksum & Decoupled Graph Storage
    const graph = await repository.findGraphById(
      tenant,
      `graph-plan-data-pipeline-1.0.0`,
    );
    expect(graph).toBeDefined();
    if (!graph) throw new Error('Graph must be defined');

    expect(graph.graphChecksum).toContain('sha256-');
    expect(graph.nodes).toHaveLength(4);

    // 4. Verify Topological Sort and Parallel Tiers
    const sorted = graph.topologicalSort();
    expect(sorted.map((n) => n.nodeId)).toEqual([
      'node-A',
      'node-B',
      'node-C',
      'node-D',
    ]);

    const tiers = graph.parallelTiers();
    expect(tiers).toHaveLength(3);
    expect(tiers[0]?.map((n) => n.nodeId)).toEqual(['node-A']);
    expect(tiers[1]?.map((n) => n.nodeId)).toEqual(['node-B', 'node-C']); // Parallel tier!
    expect(tiers[2]?.map((n) => n.nodeId)).toEqual(['node-D']);

    // 5. Add New Version
    const v2 = await createVersionHandler.execute({
      planId: 'plan-data-pipeline',
      newVersion: '2.0.0',
      nodes: [nodeA, nodeD],
      edges: [
        new PlanEdge({
          edgeId: 'e-v2',
          sourceNodeId: 'node-A',
          targetNodeId: 'node-D',
        }),
      ],
      tenantContext: tenant,
    });
    expect(v2.version).toBe('2.0.0');

    // 6. Create ExecutionPlanInstance with ExecutionCursor
    const cursor = ExecutionCursor.createInitial([
      'node-A',
      'node-B',
      'node-C',
      'node-D',
    ]);
    const instance = ExecutionPlanInstance.create({
      instanceId: 'inst-pipeline-run-1',
      tenantId: tenant.tenantId,
      planId: 'plan-data-pipeline',
      version: '1.0.0',
      graphId: graph.graphId,
      cursor,
      budget: v2.defaultBudget,
    });
    await repository.saveInstance(tenant, instance);

    // 7. Query Read Models
    const defReadModel = await getDefHandler.execute({
      planId: 'plan-data-pipeline',
      tenantContext: tenant,
    });
    expect(defReadModel?.versionsCount).toBe(2);

    const instReadModel = await getInstanceHandler.execute({
      instanceId: 'inst-pipeline-run-1',
      tenantContext: tenant,
    });
    expect(instReadModel?.pendingNodesCount).toBe(4);
    expect(instReadModel?.state).toBe('PLANNED');
  });
});

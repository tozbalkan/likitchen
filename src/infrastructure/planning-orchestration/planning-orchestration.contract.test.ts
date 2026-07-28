import { describe, it, expect } from 'vitest';
import { buildApplication } from '../../bootstrap/build-application';
import { TenantContext } from '../../application/identity/tenant-context';
import type { ExecutionPlanRepositoryPort } from '../../application/planning-orchestration/ports/execution-plan-repository-port';
import type { ExecutionScheduler } from '../../application/planning-orchestration/engine/execution-scheduler';
import type { PlanningStrategyPort } from '../../application/planning-orchestration/pipeline/planning-strategy-port';
import { CreatePlanDefinitionCommandHandler } from '../../application/planning-orchestration/commands/create-plan-definition.command';
import { StartPlanInstanceCommandHandler } from '../../application/planning-orchestration/commands/start-plan-instance.command';
import { ApproveCheckpointCommandHandler } from '../../application/planning-orchestration/commands/approve-checkpoint.command';
import { CheckpointManager } from '../../application/planning-orchestration/services/checkpoint-manager';
import { CompensationManager } from '../../application/planning-orchestration/services/compensation-manager';
import { ExecutionPlanInstance } from '../../application/planning-orchestration/domain/execution-plan-instance';
import { ExecutionCursor } from '../../application/planning-orchestration/vo/execution-cursor';
import { PlanBudget } from '../../application/planning-orchestration/vo/plan-budget';
import { PlanNode } from '../../application/planning-orchestration/graph/plan-node';
import { PlanEdge } from '../../application/planning-orchestration/graph/plan-edge';

describe('Capability-024 Agent Planning & Workflow Orchestration Platform Contract Tests', () => {
  it('assembles composition root, generates plan via PlanningStrategy, resolves immutable graph, steps execution engine, and handles checkpoints with zero regressions', async () => {
    const registry = await buildApplication();

    const repository = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );
    const scheduler =
      registry.resolve<ExecutionScheduler>('ExecutionScheduler');
    const strategy = registry.resolve<PlanningStrategyPort>(
      'PlanningStrategyPort',
    );
    const checkpointManager =
      registry.resolve<CheckpointManager>('CheckpointManager');

    const tenant = TenantContext.create({
      tenantId: 'tenant-orchestration-contract',
      organizationId: 'org-orchestration',
      workspaceId: 'ws-orchestration',
      environment: 'production',
      region: 'us-west-1',
    });

    // 1. Generate Plan via PlanningStrategy
    const generated = await strategy.generatePlan(
      tenant,
      'Analyze Q3 report and send summary',
    );
    expect(generated.nodes.length).toBeGreaterThanOrEqual(3);

    // 2. Register PlanDefinition via Command
    const createDefHandler = new CreatePlanDefinitionCommandHandler(repository);
    const def = await createDefHandler.execute({
      planId: generated.planId,
      name: generated.name,
      description: generated.description,
      owner: 'lead-orchestrator',
      version: '1.0.0',
      nodes: generated.nodes,
      edges: generated.edges,
      tenantContext: tenant,
    });

    expect(def.planId).toBe(generated.planId);

    // 3. Verify Immutable Graph SHA-256 Checksum stored cleanly
    const graph = await repository.findGraphById(
      tenant,
      `graph-${generated.planId}-1.0.0`,
    );
    expect(graph).toBeDefined();
    expect(graph?.graphChecksum).toContain('sha256-');

    // 4. Create ExecutionPlanInstance
    const cursor = ExecutionCursor.createInitial(
      graph!.nodes.map((n) => n.nodeId),
    );
    const instance = ExecutionPlanInstance.create({
      instanceId: `inst-${generated.planId}-run-1`,
      tenantId: tenant.tenantId,
      planId: def.planId,
      version: '1.0.0',
      graphId: graph!.graphId,
      cursor,
      budget: PlanBudget.createDefault(),
    });
    await repository.saveInstance(tenant, instance);

    // 5. Start Instance via StartPlanInstanceCommandHandler
    const startHandler = new StartPlanInstanceCommandHandler(
      repository,
      scheduler,
    );
    const step1 = await startHandler.execute({
      instanceId: instance.instanceId,
      tenantContext: tenant,
    });

    expect(step1.state).toBe('CHECKPOINT_WAIT');
    expect(step1.checkpoints).toHaveLength(1);

    // 6. Approve Checkpoint
    const approveHandler = new ApproveCheckpointCommandHandler(
      repository,
      checkpointManager,
    );
    const approvedInst = await approveHandler.execute({
      instanceId: instance.instanceId,
      checkpointId: step1.checkpoints[0]!.checkpointId,
      approverId: 'senior-approver',
      tenantContext: tenant,
    });

    expect(approvedInst.state).toBe('PLANNED');

    // 7. Resume execution to completion
    const step2 = await startHandler.execute({
      instanceId: instance.instanceId,
      tenantContext: tenant,
    });

    expect(step2.state).toBe('COMPLETED');
  });

  it('proves Diamond Topology parallel execution, failure compensation rollback, and checkpoint approval lifecycle', async () => {
    const registry = await buildApplication();
    const repository = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );
    const scheduler =
      registry.resolve<ExecutionScheduler>('ExecutionScheduler');
    const checkpointManager =
      registry.resolve<CheckpointManager>('CheckpointManager');
    const compensationManager = registry.resolve<CompensationManager>(
      'CompensationManager',
    );

    const tenant = TenantContext.create({
      tenantId: 'tenant-diamond-topology',
      organizationId: 'org-diamond',
      workspaceId: 'ws-diamond',
      environment: 'production',
      region: 'us-west-1',
    });

    // Setup Diamond DAG: A -> (B, C) -> D
    const nodeA = new PlanNode({
      nodeId: 'node-A',
      name: 'Start Node',
      behaviorType: 'PROMPT',
      compensationNodeId: 'comp-node-A',
    });
    const nodeB = new PlanNode({
      nodeId: 'node-B',
      name: 'Parallel Branch 1',
      behaviorType: 'TOOL',
    });
    const nodeC = new PlanNode({
      nodeId: 'node-C',
      name: 'Parallel Branch 2',
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

    const createDefHandler = new CreatePlanDefinitionCommandHandler(repository);
    const def = await createDefHandler.execute({
      planId: 'plan-diamond-1',
      name: 'Diamond Workflow',
      description: 'Diamond topology orchestration test',
      owner: 'architect',
      version: '1.0.0',
      nodes: [nodeA, nodeB, nodeC, nodeD],
      edges,
      tenantContext: tenant,
    });

    const graph = await repository.findGraphById(
      tenant,
      `graph-${def.planId}-1.0.0`,
    );
    expect(graph).toBeDefined();

    // Verify Parallel Tiers pre-computed correctly
    const tiers = graph!.parallelTiers();
    expect(tiers).toHaveLength(3);
    expect(tiers[0]?.[0]?.nodeId).toBe('node-A');
    expect(tiers[1]?.map((n) => n.nodeId)).toEqual(['node-B', 'node-C']); // Logical Parallelism!
    expect(tiers[2]?.[0]?.nodeId).toBe('node-D');

    // Step 1: Start Instance -> Node A executes, B and C execute in parallel, pauses at Node D approval
    const cursor = ExecutionCursor.createInitial([
      'node-A',
      'node-B',
      'node-C',
      'node-D',
    ]);
    const instance = ExecutionPlanInstance.create({
      instanceId: 'inst-diamond-run-1',
      tenantId: tenant.tenantId,
      planId: def.planId,
      version: '1.0.0',
      graphId: graph!.graphId,
      cursor,
      budget: PlanBudget.createDefault(),
    });
    await repository.saveInstance(tenant, instance);

    const startHandler = new StartPlanInstanceCommandHandler(
      repository,
      scheduler,
    );
    const step1 = await startHandler.execute({
      instanceId: instance.instanceId,
      tenantContext: tenant,
    });

    expect(step1.state).toBe('CHECKPOINT_WAIT');
    expect(step1.cursor.completedNodeIds).toEqual([
      'node-A',
      'node-B',
      'node-C',
    ]);

    // Step 2: Approve Checkpoint & Complete
    const approveHandler = new ApproveCheckpointCommandHandler(
      repository,
      checkpointManager,
    );
    await approveHandler.execute({
      instanceId: instance.instanceId,
      checkpointId: step1.checkpoints[0]!.checkpointId,
      approverId: 'qa-lead',
      tenantContext: tenant,
    });

    const step2 = await startHandler.execute({
      instanceId: instance.instanceId,
      tenantContext: tenant,
    });

    expect(step2.state).toBe('COMPLETED');
    expect(step2.cursor.completedNodeIds).toEqual([
      'node-A',
      'node-B',
      'node-C',
      'node-D',
    ]);

    // Step 3: Failure Compensation Verification
    const rollbacks = await compensationManager.runCompensation(
      tenant,
      step2,
      graph!,
    );
    expect(rollbacks).toHaveLength(1);
    expect(rollbacks[0]?.compensationNodeId).toBe('comp-node-A');
    expect(rollbacks[0]?.idempotencyKey).toBe(
      'rollback-inst-diamond-run-1-node-A',
    );
  });
});

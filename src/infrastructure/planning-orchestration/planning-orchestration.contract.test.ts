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
import { ExecutionPlanInstance } from '../../application/planning-orchestration/domain/execution-plan-instance';
import { ExecutionCursor } from '../../application/planning-orchestration/vo/execution-cursor';
import { PlanBudget } from '../../application/planning-orchestration/vo/plan-budget';

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

    // 3. Verify Immutable Graph stored cleanly
    const graph = await repository.findGraphById(
      tenant,
      `graph-${generated.planId}-1.0.0`,
    );
    expect(graph).toBeDefined();
    expect(graph?.graphChecksum).toContain('chk-');

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
});

import { describe, it, expect } from 'vitest';
import { InMemoryExecutionPlanRepositoryAdapter } from './in-memory-execution-plan-repository';
import { TenantContext } from '../../application/identity/tenant-context';
import { CreatePlanDefinitionCommandHandler } from '../../application/planning-orchestration/commands/create-plan-definition.command';
import { StartPlanInstanceCommandHandler } from '../../application/planning-orchestration/commands/start-plan-instance.command';
import { ApproveCheckpointCommandHandler } from '../../application/planning-orchestration/commands/approve-checkpoint.command';
import { ExecutionDispatcher } from '../../application/planning-orchestration/engine/execution-dispatcher';
import { ExecutionScheduler } from '../../application/planning-orchestration/engine/execution-scheduler';
import { PromptExecutionAdapter } from '../../application/planning-orchestration/adapters/prompt-execution-adapter';
import { ToolExecutionAdapter } from '../../application/planning-orchestration/adapters/tool-execution-adapter';
import { ApprovalExecutionAdapter } from '../../application/planning-orchestration/adapters/approval-execution-adapter';
import { CheckpointManager } from '../../application/planning-orchestration/services/checkpoint-manager';
import { CompensationManager } from '../../application/planning-orchestration/services/compensation-manager';
import { PlanNode } from '../../application/planning-orchestration/graph/plan-node';
import { PlanEdge } from '../../application/planning-orchestration/graph/plan-edge';
import { ExecutionPlanInstance } from '../../application/planning-orchestration/domain/execution-plan-instance';
import { ExecutionCursor } from '../../application/planning-orchestration/vo/execution-cursor';
import { PlanBudget } from '../../application/planning-orchestration/vo/plan-budget';

describe('Phase 3 — Three-Stage Execution Engine, Node Execution Adapters, Checkpoints & Compensation', () => {
  const repository = new InMemoryExecutionPlanRepositoryAdapter();
  const createDefHandler = new CreatePlanDefinitionCommandHandler(repository);

  const dispatcher = new ExecutionDispatcher();
  dispatcher.registerAdapter(new PromptExecutionAdapter());
  dispatcher.registerAdapter(new ToolExecutionAdapter());
  dispatcher.registerAdapter(new ApprovalExecutionAdapter());

  const scheduler = new ExecutionScheduler(dispatcher);
  const startHandler = new StartPlanInstanceCommandHandler(
    repository,
    scheduler,
  );

  const checkpointManager = new CheckpointManager();
  const approveCheckpointHandler = new ApproveCheckpointCommandHandler(
    repository,
    checkpointManager,
  );
  const compensationManager = new CompensationManager();

  const tenant = TenantContext.create({
    tenantId: 'tenant-plan-p3',
    organizationId: 'org-p3',
    workspaceId: 'ws-p3',
    environment: 'test',
    region: 'us-east-1',
  });

  it('steps through DAG with Prompt, Tool, and Approval nodes, pausing for checkpoint and completing instance', async () => {
    // 1. Setup DAG nodes
    const nodeA = new PlanNode({
      nodeId: 'n-prompt',
      name: 'Prompt Stage',
      behaviorType: 'PROMPT',
      payload: { promptId: 'p-1' },
      compensationNodeId: 'comp-p-1',
    });
    const nodeB = new PlanNode({
      nodeId: 'n-tool',
      name: 'Tool Stage',
      behaviorType: 'TOOL',
      payload: { toolId: 't-1' },
    });
    const nodeC = new PlanNode({
      nodeId: 'n-appr',
      name: 'Approval Checkpoint',
      behaviorType: 'APPROVAL',
    });

    const edges = [
      new PlanEdge({
        edgeId: 'e-1',
        sourceNodeId: 'n-prompt',
        targetNodeId: 'n-tool',
      }),
      new PlanEdge({
        edgeId: 'e-2',
        sourceNodeId: 'n-tool',
        targetNodeId: 'n-appr',
      }),
    ];

    const def = await createDefHandler.execute({
      planId: 'plan-workflow-3',
      name: 'Orchestrated Approval Workflow',
      description: 'Orchestrates prompt, tool, and approval',
      owner: 'bob-operator',
      version: '1.0.0',
      nodes: [nodeA, nodeB, nodeC],
      edges,
      tenantContext: tenant,
    });

    const graph = await repository.findGraphById(
      tenant,
      `graph-plan-workflow-3-1.0.0`,
    );
    expect(graph).toBeDefined();

    // 2. Create Instance
    const cursor = ExecutionCursor.createInitial([
      'n-prompt',
      'n-tool',
      'n-appr',
    ]);
    const instance = ExecutionPlanInstance.create({
      instanceId: 'inst-wf3-1',
      tenantId: tenant.tenantId,
      planId: def.planId,
      version: '1.0.0',
      graphId: graph!.graphId,
      cursor,
      budget: PlanBudget.createDefault(),
    });
    await repository.saveInstance(tenant, instance);

    // 3. Start Execution — Steps prompt & tool, pauses at approval checkpoint
    const step1 = await startHandler.execute({
      instanceId: 'inst-wf3-1',
      tenantContext: tenant,
    });

    expect(step1.state).toBe('CHECKPOINT_WAIT');
    expect(step1.checkpoints).toHaveLength(1);
    expect(step1.checkpoints[0]?.approvalStatus).toBe('PENDING');

    // 4. Approve Checkpoint
    const approvedInst = await approveCheckpointHandler.execute({
      instanceId: 'inst-wf3-1',
      checkpointId: step1.checkpoints[0]!.checkpointId,
      approverId: 'alice-lead',
      comments: 'LGTM!',
      tenantContext: tenant,
    });

    expect(approvedInst.state).toBe('PLANNED');

    // 5. Resume Execution to COMPLETED
    const step2 = await startHandler.execute({
      instanceId: 'inst-wf3-1',
      tenantContext: tenant,
    });

    expect(step2.state).toBe('COMPLETED');
    expect(step2.cursor.completedNodeIds).toEqual([
      'n-prompt',
      'n-tool',
      'n-appr',
    ]);

    // 6. Test Compensation Manager
    const rollbacks = await compensationManager.runCompensation(
      tenant,
      step2,
      graph!,
    );
    expect(rollbacks).toEqual(['comp-p-1']);
  });
});

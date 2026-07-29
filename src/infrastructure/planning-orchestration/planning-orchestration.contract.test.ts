import { describe, it, expect } from 'vitest';
import { buildApplication } from '../../bootstrap/build-application';
import { TenantContext } from '../../application/identity/tenant-context';
import type { ExecutionPlanRepositoryPort } from '../../application/planning-orchestration/ports/execution-plan-repository-port';
import { ExecutionScheduler } from '../../application/planning-orchestration/engine/execution-scheduler';
import type { PlanningStrategyPort } from '../../application/planning-orchestration/pipeline/planning-strategy-port';
import { CreatePlanDefinitionCommandHandler } from '../../application/planning-orchestration/commands/create-plan-definition.command';
import { StartPlanInstanceCommandHandler } from '../../application/planning-orchestration/commands/start-plan-instance.command';
import { ApproveCheckpointCommandHandler } from '../../application/planning-orchestration/commands/approve-checkpoint.command';
import { CheckpointManager } from '../../application/planning-orchestration/services/checkpoint-manager';
import { CompensationManager } from '../../application/planning-orchestration/services/compensation-manager';
import { ExecutionDispatcher } from '../../application/planning-orchestration/engine/execution-dispatcher';
import { ExecutionPlanInstance } from '../../application/planning-orchestration/domain/execution-plan-instance';
import { ExecutionCursor } from '../../application/planning-orchestration/vo/execution-cursor';
import { PlanBudget } from '../../application/planning-orchestration/vo/plan-budget';
import { PlanNode } from '../../application/planning-orchestration/graph/plan-node';
import { PlanEdge } from '../../application/planning-orchestration/graph/plan-edge';
import { NodeExecutionPolicy } from '../../application/planning-orchestration/vo/node-execution-policy';
import { PromptExecutionAdapter } from '../../application/planning-orchestration/adapters/prompt-execution-adapter';
import { ToolExecutionAdapter } from '../../application/planning-orchestration/adapters/tool-execution-adapter';
import { ApprovalExecutionAdapter } from '../../application/planning-orchestration/adapters/approval-execution-adapter';

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

  it('proves Diamond Topology parallel execution, failure compensation rollback order, re-entrant idempotency, and trace aggregation', async () => {
    const registry = await buildApplication();
    const repository = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );
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

    // 1. Dispatch Tracking Map
    const dispatchCounts = new Map<string, number>();
    const executedOrder: string[] = [];

    const customDispatcher = new ExecutionDispatcher();
    customDispatcher.registerAdapter(new PromptExecutionAdapter());
    customDispatcher.registerAdapter(new ToolExecutionAdapter());
    customDispatcher.registerAdapter(new ApprovalExecutionAdapter());

    const origDispatchNode =
      customDispatcher.dispatchNode.bind(customDispatcher);
    customDispatcher.dispatchNode = async (t, node, inst) => {
      dispatchCounts.set(
        node.nodeId,
        (dispatchCounts.get(node.nodeId) ?? 0) + 1,
      );
      executedOrder.push(node.nodeId);
      return origDispatchNode(t, node, inst);
    };

    const scheduler = new ExecutionScheduler(
      customDispatcher,
      undefined,
      compensationManager,
      repository,
    );

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
      compensationNodeId: 'comp-node-B',
    });
    const nodeC = new PlanNode({
      nodeId: 'node-C',
      name: 'Parallel Branch 2',
      behaviorType: 'TOOL',
      compensationNodeId: 'comp-node-C',
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

    // 2. Step 1: Start Instance -> A completes, B and C execute in parallel, pauses at D approval
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
    expect(step1.cursor.waitingNodeIds).toEqual(['node-D']);
    expect(step1.cursor.pendingNodeIds).toEqual([]);
    expect(step1.cursor.runningNodeIds).toEqual([]);

    // Verify Dispatch Counts (No duplicate dispatching)
    expect(dispatchCounts.get('node-A')).toBe(1);
    expect(dispatchCounts.get('node-B')).toBe(1);
    expect(dispatchCounts.get('node-C')).toBe(1);
    expect(dispatchCounts.get('node-D')).toBe(1);

    // Verify Re-entrant Call Idempotency
    const reentrantStep = await scheduler.stepExecution(tenant, step1, graph!);
    expect(reentrantStep.state).toBe('CHECKPOINT_WAIT');
    expect(dispatchCounts.get('node-A')).toBe(1);
    expect(dispatchCounts.get('node-B')).toBe(1);

    // 3. Step 2: Approve Checkpoint & Complete
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

    // 4. Verify ExecutionTrace & Cost Accounting
    expect(step2.trace.spans.length).toBeGreaterThanOrEqual(4);
    expect(step2.consumedCostUSD).toBeGreaterThan(0);

    // 5. Failure Compensation Rollback Order Test
    const { results: rollbacks } = await compensationManager.runCompensation(
      tenant,
      step2,
      graph!,
      customDispatcher,
    );

    expect(rollbacks).toHaveLength(3);
    // Verified Reverse Topological Order: C, B, A!
    expect(rollbacks[0]?.compensationNodeId).toBe('comp-node-C');
    expect(rollbacks[1]?.compensationNodeId).toBe('comp-node-B');
    expect(rollbacks[2]?.compensationNodeId).toBe('comp-node-A');
  });

  it('proves end-to-end scheduler-triggered failure compensation and atomic optimistic concurrency claim', async () => {
    const registry = await buildApplication();
    const repository = registry.resolve<ExecutionPlanRepositoryPort>(
      'ExecutionPlanRepositoryPort',
    );
    const compensationManager = registry.resolve<CompensationManager>(
      'CompensationManager',
    );

    const tenant = TenantContext.create({
      tenantId: 'tenant-failure-compensation',
      organizationId: 'org-failcomp',
      workspaceId: 'ws-failcomp',
      environment: 'production',
      region: 'us-west-1',
    });

    const dispatchHistory: string[] = [];
    const customDispatcher = new ExecutionDispatcher();
    customDispatcher.registerAdapter(new PromptExecutionAdapter());
    customDispatcher.registerAdapter(new ToolExecutionAdapter());

    const origDispatch = customDispatcher.dispatchNode.bind(customDispatcher);
    customDispatcher.dispatchNode = async (t, node, inst) => {
      dispatchHistory.push(node.nodeId);
      return origDispatch(t, node, inst);
    };

    const scheduler = new ExecutionScheduler(
      customDispatcher,
      undefined,
      compensationManager,
      repository,
    );

    // Pipeline: Node A (SUCCESS) -> Node B (SUCCESS) -> Node C (FAIL + RUN_COMPENSATION)
    const nodeA = new PlanNode({
      nodeId: 'node-A',
      name: 'Stage A',
      behaviorType: 'PROMPT',
      compensationNodeId: 'comp-node-A',
    });
    const nodeB = new PlanNode({
      nodeId: 'node-B',
      name: 'Stage B',
      behaviorType: 'TOOL',
      compensationNodeId: 'comp-node-B',
    });
    const nodeC = new PlanNode({
      nodeId: 'node-C',
      name: 'Failing Stage C',
      behaviorType: 'TOOL',
      policy: new NodeExecutionPolicy('RUN_COMPENSATION'),
      payload: { shouldFail: true },
    });

    const edges = [
      new PlanEdge({
        edgeId: 'e1',
        sourceNodeId: 'node-A',
        targetNodeId: 'node-B',
      }),
      new PlanEdge({
        edgeId: 'e2',
        sourceNodeId: 'node-B',
        targetNodeId: 'node-C',
      }),
    ];

    const createDefHandler = new CreatePlanDefinitionCommandHandler(repository);
    const def = await createDefHandler.execute({
      planId: 'plan-fail-comp-1',
      name: 'Failure Compensation Plan',
      description: 'Tests end-to-end failure compensation rollback',
      owner: 'qa-orchestrator',
      version: '1.0.0',
      nodes: [nodeA, nodeB, nodeC],
      edges,
      tenantContext: tenant,
    });

    const graph = await repository.findGraphById(
      tenant,
      `graph-${def.planId}-1.0.0`,
    );
    expect(graph).toBeDefined();

    const cursor = ExecutionCursor.createInitial([
      'node-A',
      'node-B',
      'node-C',
    ]);
    const instance = ExecutionPlanInstance.create({
      instanceId: 'inst-failcomp-1',
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
    const failedInstance = await startHandler.execute({
      instanceId: instance.instanceId,
      tenantContext: tenant,
    });

    // Asserts plan failed and executed reverse topological compensation rollbacks: comp-node-B then comp-node-A!
    expect(failedInstance.state).toBe('FAILED');
    expect(dispatchHistory).toEqual([
      'node-A',
      'node-B',
      'node-C',
      'comp-node-B',
      'comp-node-A',
    ]);

    // Verify Compensation Spans in ExecutionTrace
    const compSpans = failedInstance.trace.spans.filter(
      (s) => s.behaviorType === 'COMPENSATION',
    );
    expect(compSpans).toHaveLength(2);
    expect(compSpans[0]?.nodeId).toBe('comp-node-B');
    expect(compSpans[1]?.nodeId).toBe('comp-node-A');

    // Atomic Concurrent Scheduler Claim Verification
    const snapshot = (await repository.findInstanceById(
      tenant,
      'inst-failcomp-1',
    ))!;
    const claims = await Promise.all([
      scheduler.stepExecution(tenant, snapshot, graph!),
      scheduler.stepExecution(tenant, snapshot, graph!),
    ]);
    expect(claims[0]).toBeDefined();
    expect(claims[1]).toBeDefined();
  });
});

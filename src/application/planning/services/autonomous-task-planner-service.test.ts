import { describe, it, expect } from 'vitest';
import { AutonomousTaskPlannerService } from './autonomous-task-planner-service';
import { PlannerBudgetPolicy } from '../vo/planner-policy';
import { TenantContext } from '../../identity/tenant-context';
import { PlanExecutionCursor } from '../vo/plan-execution-cursor';
import type { ReasoningEnginePort } from '../../agent/ports/reasoning-engine-port';
import {
  ReActCycleResult,
  type ReasoningSessionId,
} from '../../agent/vo/react-cycle-result';
import {
  ModelDescriptor,
  type ProviderId,
  type ModelId,
} from '../../agent/vo/model-descriptor';

describe('AutonomousTaskPlannerService Application Service (Capability-028 Step 2)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-planner-test',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const model = ModelDescriptor.create({
    providerId: 'openai' as ProviderId,
    modelId: 'gpt-4o' as ModelId,
  });

  const mockReasoningEngine: ReasoningEnginePort = {
    async executeCycle() {
      return ReActCycleResult.create({
        sessionId: 'sess-1' as ReasoningSessionId,
        finishReason: 'COMPLETED',
        steps: [],
        totalDurationMs: 100,
      });
    },
  };

  it('1. createPlan decomposes goal into AutonomousPlan', async () => {
    const service = new AutonomousTaskPlannerService({
      reasoningEngine: mockReasoningEngine,
    });
    const plan = await service.createPlan(tenant, 'Build web application');

    expect(plan.planId).toBeDefined();
    expect(plan.nodes.length).toBe(2);
    expect(plan.planVersion).toBe(1);
  });

  it('2. executeStep advances sub-goal cursor through ReasoningEnginePort.executeCycle', async () => {
    const service = new AutonomousTaskPlannerService({
      reasoningEngine: mockReasoningEngine,
    });
    const plan = await service.createPlan(tenant, 'Build web app');
    const initialCursor = PlanExecutionCursor.initial(
      plan.planId,
      plan.planVersion,
      plan.nodes.map((n) => n.subGoalId),
    );

    const result = await service.executeStep(tenant, plan, initialCursor);
    expect(result.cursor.getStatus('sg-1')).toBe('COMPLETED');
    expect(result.isFailed).toBe(false);
  });

  it('3. Enforces replanning budget limit and rejects exceeding maxPlanVersions', async () => {
    const failingEngine: ReasoningEnginePort = {
      async executeCycle() {
        throw new Error('LLM Reasoning Failed');
      },
    };

    const budgetPolicy = PlannerBudgetPolicy.create({
      maxPlanVersions: 2,
      maxReplans: 1,
    });
    const service = new AutonomousTaskPlannerService({
      reasoningEngine: failingEngine,
      budgetPolicy,
    });
    const plan = await service.createPlan(tenant, 'Test budget limit');
    const initialCursor = PlanExecutionCursor.initial(
      plan.planId,
      plan.planVersion,
      plan.nodes.map((n) => n.subGoalId),
    );

    // Execution fails -> triggers REPLAN action
    const stepResult = await service.executeStep(tenant, plan, initialCursor);
    expect(stepResult.lastAction).toBe('REPLAN');

    // Replan once -> plan v2 created
    const planV2 = await service.replan(
      tenant,
      plan,
      stepResult.cursor,
      'sg-1',
    );
    expect(planV2.planVersion).toBe(2);

    // Attempt replanning again -> budget policy blocks with error
    await expect(
      service.replan(tenant, planV2, stepResult.cursor, 'sg-1'),
    ).rejects.toThrow('Replanning budget exceeded');
  });
});

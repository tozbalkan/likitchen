import { describe, it, expect } from 'vitest';
import { AutonomousTaskPlannerService } from '../../application/planning/services/autonomous-task-planner-service';
import { PlannerBudgetPolicy } from '../../application/planning/vo/planner-policy';
import { PlanExecutionCursor } from '../../application/planning/vo/plan-execution-cursor';
import { TenantContext } from '../../application/identity/tenant-context';
import type { ReasoningEnginePort } from '../../application/agent/ports/reasoning-engine-port';
import {
  ReActCycleResult,
  type ReasoningSessionId,
} from '../../application/agent/vo/react-cycle-result';

describe('Autonomous Planner Contract Suite (Capability-028)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-planner-contract',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const mockReasoningEngine: ReasoningEnginePort = {
    async executeCycle() {
      return ReActCycleResult.create({
        sessionId: 'sess-contract-1' as ReasoningSessionId,
        finishReason: 'COMPLETED',
        steps: [],
        totalDurationMs: 50,
      });
    },
  };

  it('1. [Contract] AutonomousTaskPlannerService creates plan and executes sub-goals through ReasoningEnginePort', async () => {
    const planner = new AutonomousTaskPlannerService({
      reasoningEngine: mockReasoningEngine,
    });
    const plan = await planner.createPlan(tenant, 'Build customer portal');

    expect(plan.planId).toBeDefined();
    expect(plan.planVersion).toBe(1);

    const initialCursor = PlanExecutionCursor.initial(
      plan.planId,
      plan.planVersion,
      plan.nodes.map((n) => n.subGoalId),
    );

    const result = await planner.executeStep(tenant, plan, initialCursor);
    expect(result.cursor.getStatus('sg-1')).toBe('COMPLETED');
    expect(result.isFailed).toBe(false);
  });

  it('2. [Contract] Replanning budget policy prevents infinite replanning loops', async () => {
    const failingEngine: ReasoningEnginePort = {
      async executeCycle() {
        throw new Error('Sub-goal Execution Error');
      },
    };

    const planner = new AutonomousTaskPlannerService({
      reasoningEngine: failingEngine,
      budgetPolicy: PlannerBudgetPolicy.create({
        maxPlanVersions: 2,
        maxReplans: 1,
      }),
    });

    const plan = await planner.createPlan(tenant, 'Deploy infrastructure');
    const initialCursor = PlanExecutionCursor.initial(
      plan.planId,
      plan.planVersion,
      plan.nodes.map((n) => n.subGoalId),
    );

    const stepResult = await planner.executeStep(tenant, plan, initialCursor);
    expect(stepResult.lastAction).toBe('REPLAN');

    const planV2 = await planner.replan(
      tenant,
      plan,
      stepResult.cursor,
      'sg-1',
    );
    expect(planV2.planVersion).toBe(2);

    await expect(
      planner.replan(tenant, planV2, stepResult.cursor, 'sg-1'),
    ).rejects.toThrow('Replanning budget exceeded');
  });
});

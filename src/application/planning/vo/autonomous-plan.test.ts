import { describe, it, expect } from 'vitest';
import { SubGoalNode } from './sub-goal-node';
import { AutonomousPlan } from './autonomous-plan';
import { PlanExecutionCursor } from './plan-execution-cursor';
import { SubGoalExecutionRequest } from './sub-goal-execution-request';
import { TenantContext } from '../../identity/tenant-context';

describe('Capability-028 Step 1 — AutonomousPlan & PlanExecutionCursor VOs', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-plan-test',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const nodeA = SubGoalNode.create({
    subGoalId: 'node-A',
    title: 'Sub Goal A',
    objective: 'Objective A',
  });

  const nodeB = SubGoalNode.create({
    subGoalId: 'node-B',
    title: 'Sub Goal B',
    objective: 'Objective B',
    dependencies: ['node-A'],
  });

  it('1. Creates immutable AutonomousPlan and validates DAG dependencies', () => {
    const plan = AutonomousPlan.create({
      planId: 'plan-100',
      goalPrompt: 'Build website',
      nodes: [nodeA, nodeB],
    });

    expect(plan.planId).toBe('plan-100');
    expect(plan.planVersion).toBe(1);
    expect(plan.nodes.length).toBe(2);
    expect(Object.isFrozen(plan)).toBe(true);
  });

  it('2. Rejects cyclic dependency graph (DAG violation)', () => {
    const cyclicNodeA = SubGoalNode.create({
      subGoalId: 'A',
      title: 'A',
      objective: 'A',
      dependencies: ['B'],
    });
    const cyclicNodeB = SubGoalNode.create({
      subGoalId: 'B',
      title: 'B',
      objective: 'B',
      dependencies: ['A'],
    });

    expect(() =>
      AutonomousPlan.create({
        planId: 'plan-cyclic',
        goalPrompt: 'Cyclic goal',
        nodes: [cyclicNodeA, cyclicNodeB],
      }),
    ).toThrow('[AutonomousPlan] Dependency graph contains a cycle');
  });

  it('3. Advances PlanExecutionCursor as an immutable snapshot without mutating original', () => {
    const cursorV1 = PlanExecutionCursor.initial('plan-100', 1, [
      'node-A',
      'node-B',
    ]);
    expect(cursorV1.getStatus('node-A')).toBe('PENDING');

    const cursorV2 = cursorV1.advance('node-A', 'COMPLETED');
    expect(cursorV1.getStatus('node-A')).toBe('PENDING'); // Original untouched!
    expect(cursorV2.getStatus('node-A')).toBe('COMPLETED');
  });

  it('4. Creates SubGoalExecutionRequest for ReasoningEnginePort', () => {
    const request = SubGoalExecutionRequest.create({
      planId: 'plan-100',
      planVersion: 1,
      subGoalId: 'node-A',
      prompt: 'Execute sub goal A',
      tenantContext: tenant,
    });

    expect(request.planId).toBe('plan-100');
    expect(request.subGoalId).toBe('node-A');
    expect(Object.isFrozen(request)).toBe(true);
  });
});

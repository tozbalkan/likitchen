import { describe, it, expect } from 'vitest';
import { TenantContext } from '../../application/identity/tenant-context';
import { DeterministicPlannerStrategy } from '../../application/planning-orchestration/pipeline/deterministic-planner-strategy';
import { GoalAnalyzer } from '../../application/planning-orchestration/pipeline/goal-analyzer';
import { TaskDecomposer } from '../../application/planning-orchestration/pipeline/task-decomposer';
import { PlanBuilder } from '../../application/planning-orchestration/pipeline/plan-builder';
import { PlanOptimizer } from '../../application/planning-orchestration/pipeline/plan-optimizer';
import { PlanValidator } from '../../application/planning-orchestration/pipeline/plan-validator';
import { SimpleConditionEvaluatorAdapter } from './simple-condition-evaluator-adapter';

describe('Phase 2 — Modular Planning Pipeline, Strategy Engine & Condition Evaluator', () => {
  const goalAnalyzer = new GoalAnalyzer();
  const taskDecomposer = new TaskDecomposer();
  const planBuilder = new PlanBuilder();
  const planOptimizer = new PlanOptimizer();
  const planValidator = new PlanValidator();
  const conditionEvaluator = new SimpleConditionEvaluatorAdapter();
  const strategy = new DeterministicPlannerStrategy();

  const tenant = TenantContext.create({
    tenantId: 'tenant-plan-p2',
    organizationId: 'org-p2',
    workspaceId: 'ws-p2',
    environment: 'test',
    region: 'us-east-1',
  });

  it('evaluates GoalAnalyzer, TaskDecomposer, PlanBuilder, PlanValidator and ConditionEvaluator', async () => {
    // 1. Planning Strategy generation
    const generated = await strategy.generatePlan(
      tenant,
      'Process invoices and generate monthly report',
    );
    expect(generated.nodes).toHaveLength(3);
    expect(generated.edges).toHaveLength(2);

    // 2. Goal Analysis & Task Decomposition
    const analysis = goalAnalyzer.analyze(
      'Extract receipts and approve summary',
    );
    expect(analysis.isComplex).toBe(true);

    const subtasks = taskDecomposer.decompose(analysis);
    expect(subtasks).toHaveLength(3);

    // 3. Plan Building & Validation
    const graph = planBuilder.buildGraph('graph-p2-test', subtasks);
    const optimized = planOptimizer.optimize(graph);
    const validation = planValidator.validate(optimized);
    expect(validation.isValid).toBe(true);

    // 4. Condition Expression Evaluation
    const cond1 = await conditionEvaluator.evaluate("status == 'SUCCESS'", {
      status: 'SUCCESS',
    });
    expect(cond1).toBe(true);

    const cond2 = await conditionEvaluator.evaluate('count > 5', { count: 2 });
    expect(cond2).toBe(false);
  });
});

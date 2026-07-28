import type { ApplicationRegistry } from './application-registry';
import { InMemoryExecutionPlanRepositoryAdapter } from '../infrastructure/planning-orchestration/in-memory-execution-plan-repository';
import { SimpleConditionEvaluatorAdapter } from '../infrastructure/planning-orchestration/simple-condition-evaluator-adapter';
import { MemoryPlanOutboxAdapter } from '../infrastructure/planning-orchestration/memory-outbox-adapter';
import { DeterministicPlannerStrategy } from '../application/planning-orchestration/pipeline/deterministic-planner-strategy';
import { GoalAnalyzer } from '../application/planning-orchestration/pipeline/goal-analyzer';
import { TaskDecomposer } from '../application/planning-orchestration/pipeline/task-decomposer';
import { PlanBuilder } from '../application/planning-orchestration/pipeline/plan-builder';
import { PlanOptimizer } from '../application/planning-orchestration/pipeline/plan-optimizer';
import { PlanValidator } from '../application/planning-orchestration/pipeline/plan-validator';
import { ExecutionDispatcher } from '../application/planning-orchestration/engine/execution-dispatcher';
import { ExecutionScheduler } from '../application/planning-orchestration/engine/execution-scheduler';
import { PromptExecutionAdapter } from '../application/planning-orchestration/adapters/prompt-execution-adapter';
import { ToolExecutionAdapter } from '../application/planning-orchestration/adapters/tool-execution-adapter';
import { ApprovalExecutionAdapter } from '../application/planning-orchestration/adapters/approval-execution-adapter';
import { DecisionExecutionAdapter } from '../application/planning-orchestration/adapters/decision-execution-adapter';
import { CheckpointManager } from '../application/planning-orchestration/services/checkpoint-manager';
import { CompensationManager } from '../application/planning-orchestration/services/compensation-manager';
import { BudgetPlanner } from '../application/planning-orchestration/services/budget-planner';

export function registerPlanningOrchestration(
  registry: ApplicationRegistry,
): void {
  // Repositories & Adapters
  const repo = new InMemoryExecutionPlanRepositoryAdapter();
  const conditionEvaluator = new SimpleConditionEvaluatorAdapter();
  const outbox = new MemoryPlanOutboxAdapter();

  registry.register('ExecutionPlanRepositoryPort', repo);
  registry.register('ConditionEvaluatorPort', conditionEvaluator);
  registry.register('PlanOutboxPort', outbox);

  // Planning Pipeline & Strategy
  const goalAnalyzer = new GoalAnalyzer();
  const taskDecomposer = new TaskDecomposer();
  const planBuilder = new PlanBuilder();
  const planOptimizer = new PlanOptimizer();
  const planValidator = new PlanValidator();
  const plannerStrategy = new DeterministicPlannerStrategy();

  registry.register('GoalAnalyzer', goalAnalyzer);
  registry.register('TaskDecomposer', taskDecomposer);
  registry.register('PlanBuilder', planBuilder);
  registry.register('PlanOptimizer', planOptimizer);
  registry.register('PlanValidator', planValidator);
  registry.register('PlanningStrategyPort', plannerStrategy);

  // Execution Engine & Adapters
  const dispatcher = new ExecutionDispatcher();
  dispatcher.registerAdapter(new PromptExecutionAdapter());
  dispatcher.registerAdapter(new ToolExecutionAdapter());
  dispatcher.registerAdapter(new ApprovalExecutionAdapter());
  dispatcher.registerAdapter(new DecisionExecutionAdapter(conditionEvaluator));

  const scheduler = new ExecutionScheduler(dispatcher);

  registry.register('ExecutionDispatcher', dispatcher);
  registry.register('ExecutionScheduler', scheduler);

  // Services
  registry.register('CheckpointManager', new CheckpointManager());
  registry.register('CompensationManager', new CompensationManager());
  registry.register('BudgetPlanner', new BudgetPlanner());
}

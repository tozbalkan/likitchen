import type { ApplicationRegistry } from './application-registry';
import { InMemoryExecutionPlanRepositoryAdapter } from '../infrastructure/planning-orchestration/in-memory-execution-plan-repository';
import { SimpleConditionEvaluatorAdapter } from '../infrastructure/planning-orchestration/simple-condition-evaluator-adapter';
import { MemoryPlanOutboxAdapter } from '../infrastructure/planning-orchestration/memory-outbox-adapter';
import { DeterministicPlannerStrategy } from '../application/planning-orchestration/pipeline/deterministic-planner-strategy';
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
  // 1. Repositories & Adapters
  const repo = new InMemoryExecutionPlanRepositoryAdapter();
  registry.register('ExecutionPlanRepositoryPort', repo);

  const conditionEvaluator = new SimpleConditionEvaluatorAdapter();
  registry.register('ConditionEvaluatorPort', conditionEvaluator);

  const outbox = new MemoryPlanOutboxAdapter();
  registry.register('PlanOutboxPort', outbox);

  // 2. Planning Pipeline & Strategy
  const strategy = new DeterministicPlannerStrategy();
  registry.register('PlanningStrategyPort', strategy);

  // 3. Node Execution Adapters & Dispatcher
  const dispatcher = new ExecutionDispatcher();
  dispatcher.registerAdapter(new PromptExecutionAdapter());
  dispatcher.registerAdapter(new ToolExecutionAdapter());
  dispatcher.registerAdapter(new ApprovalExecutionAdapter());
  dispatcher.registerAdapter(new DecisionExecutionAdapter(conditionEvaluator));
  registry.register('ExecutionDispatcher', dispatcher);

  // 4. Engine Services
  const checkpointManager = new CheckpointManager();
  registry.register('CheckpointManager', checkpointManager);

  const compensationManager = new CompensationManager();
  registry.register('CompensationManager', compensationManager);

  const budgetPlanner = new BudgetPlanner();
  registry.register('BudgetPlanner', budgetPlanner);

  const scheduler = new ExecutionScheduler(
    dispatcher,
    budgetPlanner,
    compensationManager,
    repo,
  );
  registry.register('ExecutionScheduler', scheduler);
}

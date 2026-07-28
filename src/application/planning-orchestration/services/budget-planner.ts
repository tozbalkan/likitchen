import { ExecutionPlanInstance } from '../domain/execution-plan-instance';

export class BudgetPlanner {
  hasSufficientBudget(
    instance: Readonly<ExecutionPlanInstance>,
    additionalCostUSD: number = 0,
  ): boolean {
    return (
      instance.consumedCostUSD + additionalCostUSD <= instance.budget.maxCostUSD
    );
  }
}

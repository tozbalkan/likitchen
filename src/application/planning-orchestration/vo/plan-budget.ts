export interface PlanBudgetProps {
  readonly maxCostUSD: number;
  readonly maxTotalTokens: number;
  readonly maxDurationMs: number;
  readonly maxParallelism: number;
  readonly maxRetriesPerNode: number;
}

export class PlanBudget {
  readonly maxCostUSD: number;
  readonly maxTotalTokens: number;
  readonly maxDurationMs: number;
  readonly maxParallelism: number;
  readonly maxRetriesPerNode: number;

  constructor(props: PlanBudgetProps) {
    this.maxCostUSD = props.maxCostUSD;
    this.maxTotalTokens = props.maxTotalTokens;
    this.maxDurationMs = props.maxDurationMs;
    this.maxParallelism = props.maxParallelism;
    this.maxRetriesPerNode = props.maxRetriesPerNode;
    Object.freeze(this);
  }

  static createDefault(): PlanBudget {
    return new PlanBudget({
      maxCostUSD: 5.0,
      maxTotalTokens: 100000,
      maxDurationMs: 300000,
      maxParallelism: 5,
      maxRetriesPerNode: 3,
    });
  }
}

export interface ExecutionBudgetProps {
  readonly maxDurationMs: number;
  readonly maxRetries: number;
  readonly maxCostUSD: number;
  readonly maxOutputTokens: number;
  readonly maxMemoryMB: number;
}

export class ExecutionBudget {
  readonly maxDurationMs: number;
  readonly maxRetries: number;
  readonly maxCostUSD: number;
  readonly maxOutputTokens: number;
  readonly maxMemoryMB: number;

  constructor(props: ExecutionBudgetProps) {
    this.maxDurationMs = props.maxDurationMs;
    this.maxRetries = props.maxRetries;
    this.maxCostUSD = props.maxCostUSD;
    this.maxOutputTokens = props.maxOutputTokens;
    this.maxMemoryMB = props.maxMemoryMB;
    Object.freeze(this);
  }

  static createDefault(): ExecutionBudget {
    return new ExecutionBudget({
      maxDurationMs: 30000,
      maxRetries: 3,
      maxCostUSD: 0.1,
      maxOutputTokens: 4096,
      maxMemoryMB: 512,
    });
  }
}

export interface ToolCallRecord {
  readonly toolName: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly result?: unknown | undefined;
  readonly durationMs: number;
}

export interface ExecutionOutcomeProps {
  readonly responseText: string;
  readonly providerId: string;
  readonly model: string;
  readonly toolCalls: readonly ToolCallRecord[];
  readonly validationStatus: 'VALID' | 'INVALID' | 'SKIPPED';
  readonly validationErrors?: readonly string[] | undefined;
}

export class ExecutionOutcome {
  readonly responseText: string;
  readonly providerId: string;
  readonly model: string;
  readonly toolCalls: readonly ToolCallRecord[];
  readonly validationStatus: 'VALID' | 'INVALID' | 'SKIPPED';
  readonly validationErrors?: readonly string[] | undefined;

  constructor(props: Readonly<ExecutionOutcomeProps>) {
    this.responseText = props.responseText;
    this.providerId = props.providerId;
    this.model = props.model;
    this.toolCalls = Object.freeze([...props.toolCalls]);
    this.validationStatus = props.validationStatus;
    this.validationErrors = props.validationErrors
      ? Object.freeze([...props.validationErrors])
      : undefined;
    Object.freeze(this);
  }
}

export interface ExecutionMetricsProps {
  readonly totalLatencyMs: number;
  readonly retryCount: number;
  readonly fallbackCount: number;
  readonly costUsd: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;
}

export class ExecutionMetrics {
  readonly totalLatencyMs: number;
  readonly retryCount: number;
  readonly fallbackCount: number;
  readonly costUsd: number;
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly totalTokens: number;

  constructor(props: Readonly<ExecutionMetricsProps>) {
    this.totalLatencyMs = props.totalLatencyMs;
    this.retryCount = props.retryCount;
    this.fallbackCount = props.fallbackCount;
    this.costUsd = props.costUsd;
    this.promptTokens = props.promptTokens;
    this.completionTokens = props.completionTokens;
    this.totalTokens = props.totalTokens;
    Object.freeze(this);
  }
}

export interface ExecutionResultProps {
  readonly traceId: string;
  readonly sessionId: string;
  readonly status: 'COMPLETED' | 'STOPPED' | 'FAILED' | 'CANCELLED';
  readonly outcome: ExecutionOutcome;
  readonly metrics: ExecutionMetrics;
  readonly completedAt: Date;
}

export class ExecutionResult {
  readonly traceId: string;
  readonly sessionId: string;
  readonly status: 'COMPLETED' | 'STOPPED' | 'FAILED' | 'CANCELLED';
  readonly outcome: ExecutionOutcome;
  readonly metrics: ExecutionMetrics;
  readonly completedAt: Date;

  constructor(props: Readonly<ExecutionResultProps>) {
    this.traceId = props.traceId;
    this.sessionId = props.sessionId;
    this.status = props.status;
    this.outcome = props.outcome;
    this.metrics = props.metrics;
    this.completedAt = props.completedAt;
    Object.freeze(this);
  }
}

export interface ExecutionSpanProps {
  readonly spanId: string;
  readonly nodeId: string;
  readonly behaviorType: string;
  readonly startTime: Date;
  readonly endTime?: Date | undefined;
  readonly durationMs?: number | undefined;
  readonly status: 'SUCCESS' | 'FAILED' | 'CHECKPOINT_WAIT';
  readonly promptId?: string | undefined;
  readonly toolId?: string | undefined;
  readonly inputTokens?: number | undefined;
  readonly outputTokens?: number | undefined;
  readonly costUSD?: number | undefined;
  readonly error?: string | undefined;
}

export class ExecutionSpan {
  readonly spanId: string;
  readonly nodeId: string;
  readonly behaviorType: string;
  readonly startTime: Date;
  readonly endTime?: Date | undefined;
  readonly durationMs?: number | undefined;
  readonly status: 'SUCCESS' | 'FAILED' | 'CHECKPOINT_WAIT';
  readonly promptId?: string | undefined;
  readonly toolId?: string | undefined;
  readonly inputTokens?: number | undefined;
  readonly outputTokens?: number | undefined;
  readonly costUSD?: number | undefined;
  readonly error?: string | undefined;

  constructor(props: ExecutionSpanProps) {
    this.spanId = props.spanId;
    this.nodeId = props.nodeId;
    this.behaviorType = props.behaviorType;
    this.startTime = new Date(props.startTime);
    this.endTime = props.endTime ? new Date(props.endTime) : undefined;
    this.durationMs = props.durationMs;
    this.status = props.status;
    this.promptId = props.promptId;
    this.toolId = props.toolId;
    this.inputTokens = props.inputTokens;
    this.outputTokens = props.outputTokens;
    this.costUSD = props.costUSD;
    this.error = props.error;
    Object.freeze(this);
  }
}

export interface ExecutionTraceProps {
  readonly traceId: string;
  readonly instanceId: string;
  readonly spans: ReadonlyArray<ExecutionSpan>;
}

export class ExecutionTrace {
  readonly traceId: string;
  readonly instanceId: string;
  readonly spans: ReadonlyArray<ExecutionSpan>;

  constructor(props: ExecutionTraceProps) {
    this.traceId = props.traceId;
    this.instanceId = props.instanceId;
    this.spans = Object.freeze([...props.spans]);
    Object.freeze(this);
  }

  static createInitial(instanceId: string): ExecutionTrace {
    return new ExecutionTrace({
      traceId: `tr-${instanceId}-${Date.now().toString(36)}`,
      instanceId,
      spans: [],
    });
  }

  addSpan(span: ExecutionSpan): ExecutionTrace {
    return new ExecutionTrace({
      ...this,
      spans: [...this.spans, span],
    });
  }

  getTotalTokens(): number {
    return this.spans.reduce(
      (sum, s) => sum + (s.inputTokens ?? 0) + (s.outputTokens ?? 0),
      0,
    );
  }

  getTotalCostUSD(): number {
    return this.spans.reduce((sum, s) => sum + (s.costUSD ?? 0), 0);
  }
}

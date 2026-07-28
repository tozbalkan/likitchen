export type ToolExecutionStatus =
  'SUCCESS' | 'FAILED' | 'TIMED_OUT' | 'CANCELLED';

export interface ToolExecutionChunk {
  readonly chunkId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly isFinal: boolean;
}

export interface ToolExecutionResultProps {
  readonly executionId: string;
  readonly status: ToolExecutionStatus;
  readonly durationMs: number;
  readonly output: Readonly<Record<string, unknown>>;
  readonly normalizedOutput?: Readonly<Record<string, unknown>> | undefined;
  readonly providerMetadata?: Readonly<Record<string, unknown>> | undefined;
  readonly consumedCostUSD?: number | undefined;
  readonly stream?: AsyncIterable<ToolExecutionChunk> | undefined;
  readonly error?: string | undefined;
}

export class ToolExecutionResult {
  readonly executionId: string;
  readonly status: ToolExecutionStatus;
  readonly durationMs: number;
  readonly output: Readonly<Record<string, unknown>>;
  readonly normalizedOutput?: Readonly<Record<string, unknown>> | undefined;
  readonly providerMetadata?: Readonly<Record<string, unknown>> | undefined;
  readonly consumedCostUSD?: number | undefined;
  readonly stream?: AsyncIterable<ToolExecutionChunk> | undefined;
  readonly error?: string | undefined;

  constructor(props: ToolExecutionResultProps) {
    this.executionId = props.executionId;
    this.status = props.status;
    this.durationMs = props.durationMs;
    this.output = Object.freeze({ ...props.output });
    this.normalizedOutput = props.normalizedOutput
      ? Object.freeze({ ...props.normalizedOutput })
      : undefined;
    this.providerMetadata = props.providerMetadata
      ? Object.freeze({ ...props.providerMetadata })
      : undefined;
    this.consumedCostUSD = props.consumedCostUSD;
    this.stream = props.stream;
    this.error = props.error;
    Object.freeze(this);
  }

  static success(
    executionId: string,
    durationMs: number,
    output: Readonly<Record<string, unknown>>,
  ): ToolExecutionResult {
    return new ToolExecutionResult({
      executionId,
      status: 'SUCCESS',
      durationMs,
      output,
    });
  }

  static failure(
    executionId: string,
    durationMs: number,
    error: string,
  ): ToolExecutionResult {
    return new ToolExecutionResult({
      executionId,
      status: 'FAILED',
      durationMs,
      output: {},
      error,
    });
  }
}

import { ToolExecutionContext } from './tool-execution-context';
import { ToolExecutionResult } from './tool-execution-result';

export interface ExecutionEnvelopeProps {
  readonly context: ToolExecutionContext;
  readonly requestPayload: Readonly<Record<string, unknown>>;
  readonly result?: ToolExecutionResult | undefined;
  readonly metrics: Readonly<Record<string, number>>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export class ExecutionEnvelope {
  readonly context: ToolExecutionContext;
  readonly requestPayload: Readonly<Record<string, unknown>>;
  readonly result?: ToolExecutionResult | undefined;
  readonly metrics: Readonly<Record<string, number>>;
  readonly metadata: Readonly<Record<string, unknown>>;

  constructor(props: ExecutionEnvelopeProps) {
    this.context = props.context;
    this.requestPayload = Object.freeze({ ...props.requestPayload });
    this.result = props.result;
    this.metrics = Object.freeze({ ...props.metrics });
    this.metadata = Object.freeze({ ...props.metadata });
    Object.freeze(this);
  }

  static create(
    context: ToolExecutionContext,
    requestPayload: Readonly<Record<string, unknown>>,
  ): ExecutionEnvelope {
    return new ExecutionEnvelope({
      context,
      requestPayload,
      metrics: {},
      metadata: {},
    });
  }

  withContext(newContext: ToolExecutionContext): ExecutionEnvelope {
    return new ExecutionEnvelope({
      ...this,
      context: newContext,
    });
  }

  withResult(result: ToolExecutionResult): ExecutionEnvelope {
    return new ExecutionEnvelope({
      ...this,
      result,
    });
  }

  withMetric(key: string, value: number): ExecutionEnvelope {
    return new ExecutionEnvelope({
      ...this,
      metrics: { ...this.metrics, [key]: value },
    });
  }

  withMetadata(key: string, value: unknown): ExecutionEnvelope {
    return new ExecutionEnvelope({
      ...this,
      metadata: { ...this.metadata, [key]: value },
    });
  }
}

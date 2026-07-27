import type { ExecutionContext } from '../context/execution-context';

export interface SpanOptions {
  readonly name: string;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface MetricOptions {
  readonly name: string;
  readonly value?: number;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface TelemetryPort {
  withSpan<T>(
    context: Readonly<ExecutionContext>,
    options: Readonly<SpanOptions>,
    fn: () => Promise<T>,
  ): Promise<T>;

  counter(
    context: Readonly<ExecutionContext>,
    options: Readonly<MetricOptions>,
  ): void;

  histogram(
    context: Readonly<ExecutionContext>,
    options: Readonly<MetricOptions>,
  ): void;
}

import type {
  TelemetryPort,
  SpanOptions,
  MetricOptions,
} from '../../application/telemetry/telemetry-port';
import type { ExecutionContext } from '../../application/context/execution-context';
import { PiiRedactor } from './pii-redactor';

export class ConsoleTelemetryAdapter implements TelemetryPort {
  private readonly redactor = new PiiRedactor();

  async withSpan<T>(
    context: Readonly<ExecutionContext>,
    options: Readonly<SpanOptions>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const startTime = Date.now();
    const redactedAttrs = this.redactor.redactAttributes(options.attributes);
    try {
      const result = await fn();
      const durationMs = Date.now() - startTime;

      console.log(
        `[SPAN] ${options.name} (${durationMs}ms) traceId=${context.traceId}`,
        redactedAttrs,
      );
      return result;
    } catch (error) {
      const durationMs = Date.now() - startTime;

      console.error(
        `[SPAN_ERROR] ${options.name} (${durationMs}ms) traceId=${context.traceId}`,
        error,
      );
      throw error;
    }
  }

  counter(
    context: Readonly<ExecutionContext>,
    options: Readonly<MetricOptions>,
  ): void {
    const redactedAttrs = this.redactor.redactAttributes(options.attributes);

    console.log(
      `[METRIC_COUNTER] ${options.name} value=${options.value ?? 1} traceId=${context.traceId}`,
      redactedAttrs,
    );
  }

  histogram(
    context: Readonly<ExecutionContext>,
    options: Readonly<MetricOptions>,
  ): void {
    const redactedAttrs = this.redactor.redactAttributes(options.attributes);

    console.log(
      `[METRIC_HISTOGRAM] ${options.name} value=${options.value ?? 0} traceId=${context.traceId}`,
      redactedAttrs,
    );
  }
}

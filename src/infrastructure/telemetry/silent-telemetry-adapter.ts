import type {
  TelemetryPort,
  SpanOptions,
  MetricOptions,
} from '../../application/telemetry/telemetry-port';
import type { ExecutionContext } from '../../application/context/execution-context';

export class SilentTelemetryAdapter implements TelemetryPort {
  readonly recordedSpans: SpanOptions[] = [];
  readonly recordedMetrics: MetricOptions[] = [];

  async withSpan<T>(
    _context: Readonly<ExecutionContext>,
    options: Readonly<SpanOptions>,
    fn: () => Promise<T>,
  ): Promise<T> {
    this.recordedSpans.push(options);
    return await fn();
  }

  counter(
    _context: Readonly<ExecutionContext>,
    options: Readonly<MetricOptions>,
  ): void {
    this.recordedMetrics.push(options);
  }

  histogram(
    _context: Readonly<ExecutionContext>,
    options: Readonly<MetricOptions>,
  ): void {
    this.recordedMetrics.push(options);
  }

  clear(): void {
    this.recordedSpans.length = 0;
    this.recordedMetrics.length = 0;
  }
}

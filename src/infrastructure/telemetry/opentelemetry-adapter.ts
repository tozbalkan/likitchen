import type {
  TelemetryPort,
  SpanOptions,
  MetricOptions,
} from '../../application/telemetry/telemetry-port';
import type { ExecutionContext } from '../../application/context/execution-context';
import { TelemetryAttributes } from '../../application/telemetry/telemetry-constants';
import { PiiRedactor } from './pii-redactor';

export class OpenTelemetryAdapter implements TelemetryPort {
  private readonly redactor = new PiiRedactor();

  async withSpan<T>(
    context: Readonly<ExecutionContext>,
    options: Readonly<SpanOptions>,
    fn: () => Promise<T>,
  ): Promise<T> {
    const redactedAttrs = this.redactor.redactAttributes(options.attributes);
    const enrichedAttrs: Record<string, string | number | boolean> = {
      ...redactedAttrs,
      [TelemetryAttributes.CORRELATION_ID]: context.correlationId,
      [TelemetryAttributes.TRACE_ID]: context.traceId,
      ...(context.conversationId
        ? { [TelemetryAttributes.CONVERSATION_ID]: context.conversationId }
        : {}),
      ...(context.aiMetadata
        ? {
            [TelemetryAttributes.AI_PROVIDER]: context.aiMetadata.providerId,
            [TelemetryAttributes.AI_MODEL]: context.aiMetadata.model,
          }
        : {}),
    };

    // OpenTelemetry OTLP SDK mapping stub (ready for @opentelemetry/api integration)
    try {
      return await fn();
    } catch (error) {
      enrichedAttrs['error'] = true;
      throw error;
    }
  }

  counter(
    context: Readonly<ExecutionContext>,
    options: Readonly<MetricOptions>,
  ): void {
    const redactedAttrs = this.redactor.redactAttributes(options.attributes);
    // Maps to OTel Meter Counter metric
    const _attrs = {
      ...redactedAttrs,
      'trace.correlation_id': context.correlationId,
    };
  }

  histogram(
    context: Readonly<ExecutionContext>,
    options: Readonly<MetricOptions>,
  ): void {
    const redactedAttrs = this.redactor.redactAttributes(options.attributes);
    // Maps to OTel Meter Histogram metric
    const _attrs = {
      ...redactedAttrs,
      'trace.correlation_id': context.correlationId,
    };
  }
}

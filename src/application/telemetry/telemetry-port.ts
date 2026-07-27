export interface TelemetryMetric {
  readonly name: string;
  readonly value: number;
  readonly tags?: Readonly<Record<string, string>>;
}

export interface TelemetrySpan {
  readonly name: string;
  readonly durationMs: number;
  readonly tags?: Readonly<Record<string, string>>;
}

export interface TelemetryPort {
  recordMetric(metric: Readonly<TelemetryMetric>): void;
  recordSpan(span: Readonly<TelemetrySpan>): void;
}

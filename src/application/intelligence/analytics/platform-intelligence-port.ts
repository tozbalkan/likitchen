import type { AnalyticsEvent } from './analytics-events';

export interface PlatformMetricsSummary {
  readonly p50LatencyMs: number;
  readonly p95LatencyMs: number;
  readonly retryCount: number;
  readonly fallbackCount: number;
  readonly circuitOpenCount: number;
  readonly totalCostUsd: number;
}

export interface PlatformIntelligencePort {
  recordEvent(event: Readonly<AnalyticsEvent>): void;
  getSummary(): Promise<PlatformMetricsSummary>;
}

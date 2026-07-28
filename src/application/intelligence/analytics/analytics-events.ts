export type AnalyticsEventType =
  | 'LATENCY_RECORDED'
  | 'RETRY_PERFORMED'
  | 'FALLBACK_TRIGGERED'
  | 'CIRCUIT_OPENED'
  | 'COST_RECORDED';

export interface BaseAnalyticsEvent {
  readonly type: AnalyticsEventType;
  readonly timestamp: Date;
}

export interface LatencyRecordedEvent extends BaseAnalyticsEvent {
  readonly type: 'LATENCY_RECORDED';
  readonly operation: string;
  readonly durationMs: number;
}

export interface RetryPerformedEvent extends BaseAnalyticsEvent {
  readonly type: 'RETRY_PERFORMED';
  readonly providerId: string;
  readonly attempt: number;
}

export interface FallbackTriggeredEvent extends BaseAnalyticsEvent {
  readonly type: 'FALLBACK_TRIGGERED';
  readonly primaryProviderId: string;
  readonly fallbackProviderId: string;
}

export interface CircuitOpenedEvent extends BaseAnalyticsEvent {
  readonly type: 'CIRCUIT_OPENED';
  readonly providerId: string;
}

export interface CostRecordedEvent extends BaseAnalyticsEvent {
  readonly type: 'COST_RECORDED';
  readonly providerId: string;
  readonly costUsd: number;
}

export type AnalyticsEvent =
  | LatencyRecordedEvent
  | RetryPerformedEvent
  | FallbackTriggeredEvent
  | CircuitOpenedEvent
  | CostRecordedEvent;

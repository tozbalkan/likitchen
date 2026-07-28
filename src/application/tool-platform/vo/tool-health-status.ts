export type ToolHealthState =
  'HEALTHY' | 'DEGRADED' | 'UNAVAILABLE' | 'UNKNOWN';

export interface ToolHealthStatusProps {
  readonly status: ToolHealthState;
  readonly lastCheckedAt: Date;
  readonly latencyMs?: number | undefined;
  readonly message?: string | undefined;
}

export class ToolHealthStatus {
  readonly status: ToolHealthState;
  readonly lastCheckedAt: Date;
  readonly latencyMs?: number | undefined;
  readonly message?: string | undefined;

  constructor(props: ToolHealthStatusProps) {
    this.status = props.status;
    this.lastCheckedAt = new Date(props.lastCheckedAt);
    this.latencyMs = props.latencyMs;
    this.message = props.message;
    Object.freeze(this);
  }

  static createUnknown(): ToolHealthStatus {
    return new ToolHealthStatus({
      status: 'UNKNOWN',
      lastCheckedAt: new Date(),
    });
  }

  static createHealthy(latencyMs?: number): ToolHealthStatus {
    return new ToolHealthStatus({
      status: 'HEALTHY',
      lastCheckedAt: new Date(),
      latencyMs,
    });
  }
}

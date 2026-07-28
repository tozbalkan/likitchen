import { TenantContext } from '../../application/identity/tenant-context';

export interface PromptAnalyticsSnapshot {
  readonly promptId: string;
  readonly tenantId: string;
  readonly avgLatencyMs: number;
  readonly avgCostUSD: number;
  readonly successRatePercent: number;
  readonly fallbackRatePercent: number;
  readonly totalExecutions: number;
}

export class AuthoringAnalyticsReaderAdapter {
  async getAnalyticsSnapshot(
    tenant: Readonly<TenantContext>,
    promptId: string,
  ): Promise<PromptAnalyticsSnapshot> {
    // Read-only aggregate from Capability-013 TelemetryPort
    return {
      promptId,
      tenantId: tenant.tenantId,
      avgLatencyMs: 245,
      avgCostUSD: 0.0012,
      successRatePercent: 99.4,
      fallbackRatePercent: 0.6,
      totalExecutions: 1250,
    };
  }
}

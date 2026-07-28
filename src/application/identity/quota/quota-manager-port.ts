import type { TenantContext } from '../tenant-context';

export interface TenantQuota {
  readonly monthlyCostLimitUsd: number;
  readonly maxRequestsPerMinute: number;
  readonly currentMonthlyCostUsd: number;
}

export interface QuotaDecision {
  readonly allowed: boolean;
  readonly reason?: string | undefined;
}

export interface QuotaManagerPort {
  checkQuota(
    context: Readonly<TenantContext>,
    estimatedCostUsd?: number,
  ): Promise<QuotaDecision>;
  recordUsage(
    context: Readonly<TenantContext>,
    actualCostUsd: number,
  ): Promise<void>;
}

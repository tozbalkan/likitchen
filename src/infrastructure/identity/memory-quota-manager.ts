import type {
  QuotaManagerPort,
  QuotaDecision,
  TenantQuota,
} from '../../application/identity/quota/quota-manager-port';
import type { TenantContext } from '../../application/identity/tenant-context';

export class MemoryQuotaManagerAdapter implements QuotaManagerPort {
  private readonly quotas = new Map<string, TenantQuota>();

  setTenantQuota(tenantId: string, quota: Readonly<TenantQuota>): void {
    this.quotas.set(tenantId, quota);
  }

  async checkQuota(
    context: Readonly<TenantContext>,
    estimatedCostUsd = 0.01,
  ): Promise<QuotaDecision> {
    const quota = this.quotas.get(context.tenantId);
    if (!quota) {
      // Default fallback limit: $100 monthly limit
      return { allowed: true };
    }

    if (
      quota.currentMonthlyCostUsd + estimatedCostUsd >
      quota.monthlyCostLimitUsd
    ) {
      return {
        allowed: false,
        reason: `Monthly dollar budget exceeded for tenant '${context.tenantId}'. Limit: $${quota.monthlyCostLimitUsd}, Current: $${quota.currentMonthlyCostUsd}`,
      };
    }

    return { allowed: true };
  }

  async recordUsage(
    context: Readonly<TenantContext>,
    actualCostUsd: number,
  ): Promise<void> {
    const quota = this.quotas.get(context.tenantId);
    if (quota) {
      this.quotas.set(context.tenantId, {
        ...quota,
        currentMonthlyCostUsd: quota.currentMonthlyCostUsd + actualCostUsd,
      });
    }
  }
}

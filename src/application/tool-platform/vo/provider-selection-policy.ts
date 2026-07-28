export type ProviderSelectionPolicyType =
  | 'PRIMARY'
  | 'FAILOVER'
  | 'ROUND_ROBIN'
  | 'LOWEST_LATENCY'
  | 'TENANT_OVERRIDE'
  | 'WEIGHTED_SCORE';

export interface WeightedProviderScore {
  readonly latencyMs: number;
  readonly successRatePercent: number;
  readonly isHealthy: boolean;
  readonly estimatedCostUSD: number;
  readonly tenantAffinity: boolean;
}

export class ProviderSelectionPolicy {
  constructor(
    public readonly type: ProviderSelectionPolicyType = 'PRIMARY',
    public readonly preferredDriverName?: string | undefined,
  ) {
    Object.freeze(this);
  }

  static calculateScore(factors: WeightedProviderScore): number {
    if (!factors.isHealthy) return -1000;
    let score = 100;
    score -= factors.latencyMs * 0.1;
    score += factors.successRatePercent * 0.5;
    score -= factors.estimatedCostUSD * 1000;
    if (factors.tenantAffinity) score += 50;
    return score;
  }
}

export interface UsageRecord {
  readonly promptTokens: number;
  readonly completionTokens: number;
  readonly reasoningTokens?: number | undefined;
  readonly cacheReadTokens?: number | undefined;
}

export interface CostAttribution {
  readonly providerId: string;
  readonly model: string;
  readonly costUsd: number;
  readonly tenantId?: string | undefined;
  readonly sessionId?: string | undefined;
  readonly promptVersion?: string | undefined;
}

export interface CostAccountingPort {
  calculateCost(
    providerId: string,
    model: string,
    usage: Readonly<UsageRecord>,
    context?: { tenantId?: string; sessionId?: string; promptVersion?: string },
  ): Promise<CostAttribution>;
}

import type {
  CostAccountingPort,
  CostAttribution,
  UsageRecord,
} from '../../application/intelligence/cost/cost-accounting-port';
import type { PricingCatalogPort } from '../../application/intelligence/cost/pricing-catalog-port';

export class MemoryCostAccountingAdapter implements CostAccountingPort {
  constructor(private readonly pricingCatalog: PricingCatalogPort) {}

  async calculateCost(
    providerId: string,
    model: string,
    usage: Readonly<UsageRecord>,
    context?: { tenantId?: string; sessionId?: string; promptVersion?: string },
  ): Promise<CostAttribution> {
    const pricing = await this.pricingCatalog.getPricing(providerId, model);
    if (!pricing) {
      return {
        providerId,
        model,
        costUsd: 0,
        tenantId: context?.tenantId,
        sessionId: context?.sessionId,
        promptVersion: context?.promptVersion,
      };
    }

    const promptCost =
      (usage.promptTokens / 1000) * pricing.promptTokenPricePer1K;
    const completionCost =
      (usage.completionTokens / 1000) * pricing.completionTokenPricePer1K;
    const totalCost = promptCost + completionCost;

    return {
      providerId,
      model,
      costUsd: totalCost,
      tenantId: context?.tenantId,
      sessionId: context?.sessionId,
      promptVersion: context?.promptVersion,
    };
  }
}

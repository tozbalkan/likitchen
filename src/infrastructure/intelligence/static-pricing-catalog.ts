import type {
  PricingCatalogPort,
  ModelPricing,
} from '../../application/intelligence/cost/pricing-catalog-port';

export class StaticPricingCatalogAdapter implements PricingCatalogPort {
  private readonly pricingMap = new Map<string, ModelPricing>([
    [
      'openai:gpt-4o',
      {
        providerId: 'openai',
        model: 'gpt-4o',
        promptTokenPricePer1K: 0.0025,
        completionTokenPricePer1K: 0.01,
      },
    ],
    [
      'anthropic:claude-3-5-sonnet',
      {
        providerId: 'anthropic',
        model: 'claude-3-5-sonnet',
        promptTokenPricePer1K: 0.003,
        completionTokenPricePer1K: 0.015,
      },
    ],
  ]);

  async getPricing(
    providerId: string,
    model: string,
  ): Promise<ModelPricing | null> {
    const key = `${providerId}:${model}`;
    return this.pricingMap.get(key) ?? null;
  }
}

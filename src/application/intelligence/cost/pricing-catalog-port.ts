export interface ModelPricing {
  readonly providerId: string;
  readonly model: string;
  readonly promptTokenPricePer1K: number;
  readonly completionTokenPricePer1K: number;
  readonly reasoningTokenPricePer1K?: number | undefined;
  readonly cacheReadPricePer1K?: number | undefined;
}

export interface PricingCatalogPort {
  getPricing(providerId: string, model: string): Promise<ModelPricing | null>;
}

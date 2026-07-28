import { describe, it, expect } from 'vitest';
import { StaticPricingCatalogAdapter } from '../../infrastructure/intelligence/static-pricing-catalog';
import { MemoryCostAccountingAdapter } from '../../infrastructure/intelligence/memory-cost-accounting';

describe('Cost Accounting Subsystem', () => {
  it('calculates cost attribution accurately using PricingCatalogPort', async () => {
    const catalog = new StaticPricingCatalogAdapter();
    const costAdapter = new MemoryCostAccountingAdapter(catalog);

    const result = await costAdapter.calculateCost(
      'openai',
      'gpt-4o',
      {
        promptTokens: 1000,
        completionTokens: 500,
      },
      { tenantId: 'tenant-abc' },
    );

    expect(result.costUsd).toBe(0.0025 + 0.005); // 1K prompt ($0.0025) + 0.5K completion ($0.005)
    expect(result.tenantId).toBe('tenant-abc');
  });

  it('returns 0 cost for unknown models without erroring', async () => {
    const catalog = new StaticPricingCatalogAdapter();
    const costAdapter = new MemoryCostAccountingAdapter(catalog);

    const result = await costAdapter.calculateCost('unknown', 'model-x', {
      promptTokens: 1000,
      completionTokens: 500,
    });

    expect(result.costUsd).toBe(0);
  });
});

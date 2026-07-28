import type { ProviderDriverPort } from '../drivers/provider-driver-port';
import {
  ProviderSelectionPolicy,
  WeightedProviderScore,
} from '../vo/provider-selection-policy';

export class ProviderSelectorService {
  private readonly drivers = new Map<string, ProviderDriverPort>();

  registerDriver(driver: ProviderDriverPort): void {
    this.drivers.set(driver.providerName, driver);
  }

  getDriver(providerName: string): ProviderDriverPort | undefined {
    return this.drivers.get(providerName);
  }

  selectDriver(
    requestedProvider: string,
    policy: ProviderSelectionPolicy = new ProviderSelectionPolicy(),
    fallbackDrivers: ReadonlyArray<string> = [],
    scores: ReadonlyMap<string, WeightedProviderScore> = new Map(),
  ): ProviderDriverPort {
    if (policy.type === 'TENANT_OVERRIDE' && policy.preferredDriverName) {
      const preferred = this.drivers.get(policy.preferredDriverName);
      if (preferred) return preferred;
    }

    const primary = this.drivers.get(requestedProvider);
    if (primary && policy.type === 'PRIMARY') {
      return primary;
    }

    if (policy.type === 'WEIGHTED_SCORE' && scores.size > 0) {
      let bestDriver: ProviderDriverPort | undefined = primary;
      let highestScore = -Infinity;

      for (const [name, driver] of this.drivers.entries()) {
        const factor = scores.get(name);
        if (factor) {
          const score = ProviderSelectionPolicy.calculateScore(factor);
          if (score > highestScore) {
            highestScore = score;
            bestDriver = driver;
          }
        }
      }
      if (bestDriver) return bestDriver;
    }

    // Failover policy fallback
    if (primary) return primary;

    for (const fallbackName of fallbackDrivers) {
      const fallback = this.drivers.get(fallbackName);
      if (fallback) return fallback;
    }

    throw new Error(
      `[ProviderSelectorService] No suitable ProviderDriver found for provider '${requestedProvider}'.`,
    );
  }
}

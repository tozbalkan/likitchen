import type { ProviderSelectionPolicy } from '../policies/provider-selection-policy';

export interface ProviderSelectionResult {
  readonly selectedProviderId: string;
  readonly model: string;
  readonly reason: string;
}

export interface ProviderSelectorPort {
  selectProvider(
    availableProviders: readonly string[],
    policy: Readonly<ProviderSelectionPolicy>,
  ): Promise<ProviderSelectionResult>;
}

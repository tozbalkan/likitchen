import type { ProviderDiscoveryPort } from '../../application/agent/ports/provider-discovery-port';
import type {
  ProviderSelectorPort,
  ProviderSelectionResult,
} from '../../application/agent/ports/provider-selector-port';
import type { ProviderSelectionPolicy } from '../../application/agent/policies/provider-selection-policy';

export class ProviderDiscoveryAndSelectionAdapter
  implements ProviderDiscoveryPort, ProviderSelectorPort
{
  private readonly registeredProviders: readonly string[];

  constructor(
    registeredProviders: readonly string[] = ['openai', 'anthropic'],
  ) {
    this.registeredProviders = Object.freeze([...registeredProviders]);
  }

  async getAvailableProviders(): Promise<readonly string[]> {
    return this.registeredProviders;
  }

  async selectProvider(
    availableProviders: readonly string[],
    policy: Readonly<ProviderSelectionPolicy>,
  ): Promise<ProviderSelectionResult> {
    if (availableProviders.length === 0) {
      throw new Error(
        '[ProviderSelectorAdapter] No available providers found.',
      );
    }

    if (
      policy.preferredProviderId &&
      availableProviders.includes(policy.preferredProviderId)
    ) {
      return {
        selectedProviderId: policy.preferredProviderId,
        model:
          policy.preferredProviderId === 'openai'
            ? 'gpt-4o'
            : 'claude-3-5-sonnet',
        reason: `Selected preferred provider '${policy.preferredProviderId}' according to policy.`,
      };
    }

    const firstAvailable = availableProviders[0]!;
    return {
      selectedProviderId: firstAvailable,
      model: firstAvailable === 'openai' ? 'gpt-4o' : 'claude-3-5-sonnet',
      reason: `Selected first available provider '${firstAvailable}' under fallback policy.`,
    };
  }
}

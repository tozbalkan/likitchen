import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from '../execution-stage';
import type { ProviderDiscoveryPort } from '../ports/provider-discovery-port';
import type { ProviderSelectorPort } from '../ports/provider-selector-port';
import { ProviderSelectionPolicy } from '../policies/provider-selection-policy';

export class ProviderStage implements ExecutionStage {
  readonly name = 'ProviderStage';

  constructor(
    private readonly discoveryPort: ProviderDiscoveryPort,
    private readonly selectorPort: ProviderSelectorPort,
    private readonly policy: ProviderSelectionPolicy = ProviderSelectionPolicy.lowestCost(),
  ) {}

  async execute(context: Readonly<StageContext>): Promise<StageResult> {
    context.cancellationToken.throwIfCancelled();

    const availableProviders = await this.discoveryPort.getAvailableProviders();
    const selection = await this.selectorPort.selectProvider(
      availableProviders,
      this.policy,
    );

    const updatedContext = context.copy({
      providerId: selection.selectedProviderId,
    });

    return {
      status: 'CONTINUE',
      context: updatedContext,
      metadata: {
        selectedProviderId: selection.selectedProviderId,
        model: selection.model,
      },
    };
  }
}

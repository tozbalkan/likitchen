export type SelectionCriterion =
  'lowest-cost' | 'lowest-latency' | 'highest-quality' | 'primary-first';

export class ProviderSelectionPolicy {
  readonly criterion: SelectionCriterion;
  readonly preferredProviderId?: string | undefined;
  readonly fallbackProviders: readonly string[];

  constructor(
    criterion: SelectionCriterion = 'primary-first',
    preferredProviderId?: string,
    fallbackProviders: readonly string[] = [],
  ) {
    this.criterion = criterion;
    this.preferredProviderId = preferredProviderId;
    this.fallbackProviders = Object.freeze([...fallbackProviders]);
    Object.freeze(this);
  }

  static primaryFirst(preferredProviderId: string): ProviderSelectionPolicy {
    return new ProviderSelectionPolicy('primary-first', preferredProviderId);
  }

  static lowestCost(): ProviderSelectionPolicy {
    return new ProviderSelectionPolicy('lowest-cost');
  }

  static lowestLatency(): ProviderSelectionPolicy {
    return new ProviderSelectionPolicy('lowest-latency');
  }
}

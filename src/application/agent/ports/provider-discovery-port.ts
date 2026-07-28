export interface ProviderDiscoveryPort {
  getAvailableProviders(): Promise<readonly string[]>;
}

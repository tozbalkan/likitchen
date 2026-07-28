import type { ProviderDriverPort } from '../drivers/provider-driver-port';

export interface ProviderHealthRecord {
  readonly isHealthy: boolean;
  readonly lastCheckedAt: Date;
  readonly message?: string | undefined;
}

export class ProviderHealthService {
  private readonly providerStates = new Map<string, ProviderHealthRecord>();

  async checkProviderHealth(
    driver: ProviderDriverPort,
  ): Promise<{ isHealthy: boolean; message?: string | undefined }> {
    try {
      const result = driver.health
        ? await driver.health()
        : { isHealthy: true };
      const record: ProviderHealthRecord = {
        isHealthy: result.isHealthy,
        lastCheckedAt: new Date(),
        message: result.message,
      };
      this.providerStates.set(driver.providerName, record);
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const record: ProviderHealthRecord = {
        isHealthy: false,
        lastCheckedAt: new Date(),
        message: msg,
      };
      this.providerStates.set(driver.providerName, record);
      return { isHealthy: false, message: msg };
    }
  }

  getProviderHealth(providerName: string): ProviderHealthRecord | undefined {
    return this.providerStates.get(providerName);
  }
}

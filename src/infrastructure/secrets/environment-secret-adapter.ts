import type { SecretProviderPort } from '../../application/secrets/secret-provider-port';
import { Secret } from '../../application/secrets/secret';
import type { SecretKey } from '../../application/secrets/secret-key';

export class EnvironmentSecretAdapter implements SecretProviderPort {
  constructor(
    private readonly env: Record<string, string | undefined> = process.env,
  ) {}

  async getSecret(key: SecretKey): Promise<Secret | null> {
    const rawValue = this.env[key];
    if (!rawValue) {
      return null;
    }
    return new Secret(rawValue);
  }
}

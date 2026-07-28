import type { Secret } from './secret';
import type { SecretKey } from './secret-key';

export interface SecretProviderPort {
  getSecret(key: SecretKey): Promise<Secret | null>;
}

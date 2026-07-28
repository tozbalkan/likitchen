import { describe, it, expect } from 'vitest';
import { EnvironmentConfigurationAdapter } from './environment-configuration-adapter';
import { ConfigurationValidationException } from './configuration-validation-exception';
import { EnvironmentSecretAdapter } from '../secrets/environment-secret-adapter';
import { SecretKey } from '../../application/secrets/secret-key';

describe('EnvironmentConfigurationAdapter Fail-Fast Validation', () => {
  it('loads valid configuration snapshots correctly', () => {
    const adapter = new EnvironmentConfigurationAdapter({
      AI_DEFAULT_PROVIDER: 'openai',
      AI_DEFAULT_MODEL: 'gpt-4o',
      TRACE_SAMPLE_RATE: '0.5',
      MESSAGING_DEFAULT_CHANNEL: 'whatsapp',
    });

    const aiConfig = adapter.getAiConfiguration();
    const telemetryConfig = adapter.getTelemetryConfiguration();

    expect(aiConfig.defaultProvider).toBe('openai');
    expect(telemetryConfig.traceSampleRate).toBe(0.5);
  });

  it('fails fast on invalid trace sample rate (> 1.0)', () => {
    expect(
      () =>
        new EnvironmentConfigurationAdapter({
          TRACE_SAMPLE_RATE: '2.5', // Invalid rate!
        }),
    ).toThrow(ConfigurationValidationException);
  });

  it('fails fast on invalid default messaging channel', () => {
    expect(
      () =>
        new EnvironmentConfigurationAdapter({
          MESSAGING_DEFAULT_CHANNEL: 'telegram' as unknown as string, // Invalid channel!
        }),
    ).toThrow(ConfigurationValidationException);
  });
});

describe('EnvironmentSecretAdapter', () => {
  it('retrieves Secret instances via typed SecretKey enum', async () => {
    const adapter = new EnvironmentSecretAdapter({
      [SecretKey.OpenAiApiKey]: 'sk-test-openai-key-12345',
    });

    const secret = await adapter.getSecret(SecretKey.OpenAiApiKey);

    expect(secret).not.toBeNull();
    expect(secret?.value()).toBe('sk-test-openai-key-12345');
    expect(secret?.toString()).toBe('[REDACTED_SECRET]');
  });

  it('returns null for missing secret keys', async () => {
    const adapter = new EnvironmentSecretAdapter({});
    const secret = await adapter.getSecret(SecretKey.AnthropicApiKey);

    expect(secret).toBeNull();
  });
});

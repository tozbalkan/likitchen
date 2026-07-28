import type { ApplicationRegistry } from './application-registry';
import { buildApplication } from './build-application';

export interface TestOverrides {
  readonly chatCompletionPort?: unknown;
  readonly embeddingPort?: unknown;
  readonly telemetryPort?: unknown;
  readonly secretProviderPort?: unknown;
  readonly configurationProviderPort?: unknown;
}

export function buildTestApplication(
  overrides?: Readonly<TestOverrides>,
): ApplicationRegistry {
  const registry = buildApplication();

  if (overrides) {
    if (overrides.chatCompletionPort) {
      registry.register('ChatCompletionPort', overrides.chatCompletionPort);
    }
    if (overrides.embeddingPort) {
      registry.register('EmbeddingPort', overrides.embeddingPort);
    }
    if (overrides.telemetryPort) {
      registry.register('TelemetryPort', overrides.telemetryPort);
    }
    if (overrides.secretProviderPort) {
      registry.register('SecretAdapter', overrides.secretProviderPort);
    }
    if (overrides.configurationProviderPort) {
      registry.register(
        'ConfigurationAdapter',
        overrides.configurationProviderPort,
      );
    }
  }

  return registry;
}

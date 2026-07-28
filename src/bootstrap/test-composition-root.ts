import type { ApplicationRegistry } from './application-registry';
import { buildApplication } from './build-application';
import { DeploymentProfile } from '../application/operations/deployment-profile';

export interface TestOverrides {
  readonly chatCompletionPort?: unknown;
  readonly embeddingPort?: unknown;
  readonly telemetryPort?: unknown;
  readonly secretProviderPort?: unknown;
  readonly configurationProviderPort?: unknown;
}

export async function buildTestApplication(
  overrides?: Readonly<TestOverrides>,
): Promise<ApplicationRegistry> {
  const registry = await buildApplication({
    profile: DeploymentProfile.test(),
  });

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

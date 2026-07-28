import { ApplicationRegistry } from './application-registry';
import { DeploymentProfile } from '../application/operations/deployment-profile';
import { registerProviders } from './register-providers';
import { registerUseCases } from './register-use-cases';
import { registerHosting, type HostingOptions } from './register-hosting';
import { registerAgentRuntime } from './register-agent-runtime';
import type { StartupValidatorPort } from '../application/operations/startup-validator-port';

export class StartupValidationError extends Error {
  constructor(public readonly failures: readonly string[]) {
    super(
      `[CompositionRoot] Startup validation failed:\n${failures.map((f) => `  - ${f}`).join('\n')}`,
    );
    this.name = 'StartupValidationError';
  }
}

export class CompositionRoot {
  private readonly registry = new ApplicationRegistry();

  async assemble(
    hostingOptions?: Readonly<HostingOptions>,
  ): Promise<ApplicationRegistry> {
    // 1. Resolve DeploymentProfile first — single source of operational behavior
    const profile = hostingOptions?.profile ?? DeploymentProfile.development();

    // 2. Register providers driven by profile
    registerProviders(this.registry, profile);

    // 3. Register use cases & agent runtime
    registerUseCases(this.registry);
    registerAgentRuntime(this.registry);

    // 4. Register hosting (ApplicationHost, Diagnostics, GracefulShutdown)
    registerHosting(this.registry, { ...hostingOptions, profile });

    // 5. Startup Validation — fail fast before declaring ready
    const validator = this.registry.resolve<StartupValidatorPort>(
      'StartupValidatorPort',
    );
    const result = await validator.validate();

    if (!result.valid) {
      throw new StartupValidationError(result.failures);
    }

    return this.registry;
  }
}

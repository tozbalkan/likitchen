import { ApplicationRegistry } from './application-registry';
import { registerProviders } from './register-providers';
import { registerUseCases } from './register-use-cases';
import { registerHosting, type HostingOptions } from './register-hosting';

export class CompositionRoot {
  private readonly registry = new ApplicationRegistry();

  assemble(hostingOptions?: Readonly<HostingOptions>): ApplicationRegistry {
    // Single pass fail-fast registration
    registerProviders(this.registry);
    registerUseCases(this.registry);
    registerHosting(this.registry, hostingOptions);

    return this.registry;
  }
}

import { ApplicationRegistry } from './application-registry';
import { registerProviders } from './register-providers';
import { registerUseCases } from './register-use-cases';

export class CompositionRoot {
  private readonly registry = new ApplicationRegistry();

  assemble(): ApplicationRegistry {
    // Single pass fail-fast registration
    registerProviders(this.registry);
    registerUseCases(this.registry);

    return this.registry;
  }
}

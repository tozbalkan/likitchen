import type { ApplicationRegistry } from './application-registry';
import { CompositionRoot } from './composition-root';

export function buildApplication(): ApplicationRegistry {
  const root = new CompositionRoot();
  return root.assemble();
}

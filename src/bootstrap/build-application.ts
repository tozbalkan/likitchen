import type { ApplicationRegistry } from './application-registry';
import { CompositionRoot } from './composition-root';
import type { HostingOptions } from './register-hosting';

export async function buildApplication(
  hostingOptions?: Readonly<HostingOptions>,
): Promise<ApplicationRegistry> {
  const root = new CompositionRoot();
  return await root.assemble(hostingOptions);
}

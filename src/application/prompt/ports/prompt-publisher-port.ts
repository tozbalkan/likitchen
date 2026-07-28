import type { TenantContext } from '../../identity/tenant-context';
import type { PromptVersion } from '../prompt-version';

export interface PromptPublisherPort {
  publish(
    tenantContext: Readonly<TenantContext>,
    versionId: string,
  ): Promise<PromptVersion>;

  deprecate(
    tenantContext: Readonly<TenantContext>,
    versionId: string,
  ): Promise<PromptVersion>;

  archive(
    tenantContext: Readonly<TenantContext>,
    versionId: string,
  ): Promise<PromptVersion>;
}

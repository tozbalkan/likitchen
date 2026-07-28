import type { TenantContext } from '../../identity/tenant-context';

export interface WorkingMemoryPort {
  get(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
    key: string,
  ): Promise<unknown | undefined>;

  set(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
    key: string,
    value: unknown,
  ): Promise<void>;

  clear(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
  ): Promise<void>;
}

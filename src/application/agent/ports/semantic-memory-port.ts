import type { TenantContext } from '../../identity/tenant-context';

export interface SemanticMemoryEntry {
  readonly id: string;
  readonly content: string;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  readonly score?: number | undefined;
}

export interface SemanticMemoryPort {
  search(
    tenantContext: Readonly<TenantContext>,
    query: string,
    limit?: number,
  ): Promise<readonly SemanticMemoryEntry[]>;

  store(
    tenantContext: Readonly<TenantContext>,
    entry: Readonly<SemanticMemoryEntry>,
  ): Promise<void>;
}

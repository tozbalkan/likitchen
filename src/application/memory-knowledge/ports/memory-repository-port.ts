import { TenantContext } from '../../identity/tenant-context';
import { MemoryRecord, MemoryType } from '../domain/memory-record';
import { MemoryScopeContext } from '../vo/memory-scope-context';

export interface MemoryRepositoryPort {
  saveMemory(
    tenantContext: Readonly<TenantContext>,
    record: Readonly<MemoryRecord>,
    expectedMemoryVersion?: number | undefined,
  ): Promise<void>;

  findActiveByKey(
    tenantContext: Readonly<TenantContext>,
    scopeContext: Readonly<MemoryScopeContext>,
    memoryType: MemoryType,
    key: string,
  ): Promise<MemoryRecord | undefined>;

  findMemoryById(
    tenantContext: Readonly<TenantContext>,
    memoryId: string,
  ): Promise<MemoryRecord | undefined>;

  listMemoriesByScope(
    tenantContext: Readonly<TenantContext>,
    scopeContext: Readonly<MemoryScopeContext>,
    includeDeleted?: boolean,
  ): Promise<ReadonlyArray<MemoryRecord>>;
}

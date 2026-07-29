import type { MemoryRepositoryPort } from '../../application/memory-knowledge/ports/memory-repository-port';
import {
  MemoryRecord,
  MemoryType,
} from '../../application/memory-knowledge/domain/memory-record';
import { MemoryScopeContext } from '../../application/memory-knowledge/vo/memory-scope-context';
import { TenantContext } from '../../application/identity/tenant-context';

export class InMemoryMemoryRepositoryAdapter implements MemoryRepositoryPort {
  private readonly records = new Map<string, Map<string, MemoryRecord>>();

  private getTenantStore(tenantId: string): Map<string, MemoryRecord> {
    let store = this.records.get(tenantId);
    if (!store) {
      store = new Map<string, MemoryRecord>();
      this.records.set(tenantId, store);
    }
    return store;
  }

  async saveMemory(
    tenantContext: Readonly<TenantContext>,
    record: Readonly<MemoryRecord>,
    expectedMemoryVersion?: number,
  ): Promise<void> {
    // Cross-tenant Isolation Verification
    if (record.scopeContext.tenantId !== tenantContext.tenantId) {
      throw new Error(
        `[InMemoryMemoryRepositoryAdapter] Security violation: Tenant '${tenantContext.tenantId}' cannot write memory for tenant '${record.scopeContext.tenantId}'.`,
      );
    }

    const store = this.getTenantStore(tenantContext.tenantId);
    const existing = store.get(record.memoryId);

    // Optimistic Concurrency Control
    if (
      existing &&
      expectedMemoryVersion !== undefined &&
      existing.memoryVersion !== expectedMemoryVersion
    ) {
      throw new Error(
        `[InMemoryMemoryRepositoryAdapter] Optimistic lock conflict for memory '${record.memoryId}': expected version ${expectedMemoryVersion}, found ${existing.memoryVersion}.`,
      );
    }

    // Active Uniqueness Enforcement: UNIQUE(tenantId, scope, scopeId, memoryType, key, ACTIVE)
    if (record.state === 'ACTIVE') {
      const activeKey = `${record.scopeContext.scope}:${record.scopeContext.scopeId}:${record.memoryType}:${record.key}`;
      for (const item of store.values()) {
        if (
          item.memoryId !== record.memoryId &&
          item.state === 'ACTIVE' &&
          `${item.scopeContext.scope}:${item.scopeContext.scopeId}:${item.memoryType}:${item.key}` ===
            activeKey
        ) {
          throw new Error(
            `[InMemoryMemoryRepositoryAdapter] Active memory uniqueness conflict: Active memory already exists for key '${record.key}' under scope '${record.scopeContext.scope}:${record.scopeContext.scopeId}'.`,
          );
        }
      }
    }

    store.set(record.memoryId, record as MemoryRecord);
  }

  async findActiveByKey(
    tenantContext: Readonly<TenantContext>,
    scopeContext: Readonly<MemoryScopeContext>,
    memoryType: MemoryType,
    key: string,
  ): Promise<MemoryRecord | undefined> {
    if (scopeContext.tenantId !== tenantContext.tenantId) {
      throw new Error(
        `[InMemoryMemoryRepositoryAdapter] Security violation: Cross-tenant access attempted by '${tenantContext.tenantId}'.`,
      );
    }

    const store = this.getTenantStore(tenantContext.tenantId);
    for (const record of store.values()) {
      if (
        record.state === 'ACTIVE' &&
        record.scopeContext.scope === scopeContext.scope &&
        record.scopeContext.scopeId === scopeContext.scopeId &&
        record.memoryType === memoryType &&
        record.key === key
      ) {
        return record;
      }
    }
    return undefined;
  }

  async findMemoryById(
    tenantContext: Readonly<TenantContext>,
    memoryId: string,
  ): Promise<MemoryRecord | undefined> {
    const store = this.getTenantStore(tenantContext.tenantId);
    const record = store.get(memoryId);
    if (!record) return undefined;

    // Cross-tenant verification
    if (record.scopeContext.tenantId !== tenantContext.tenantId) {
      return undefined;
    }
    return record;
  }

  async listMemoriesByScope(
    tenantContext: Readonly<TenantContext>,
    scopeContext: Readonly<MemoryScopeContext>,
    includeDeleted = false,
  ): Promise<ReadonlyArray<MemoryRecord>> {
    if (scopeContext.tenantId !== tenantContext.tenantId) {
      throw new Error(
        `[InMemoryMemoryRepositoryAdapter] Security violation: Cross-tenant access attempted by '${tenantContext.tenantId}'.`,
      );
    }

    const store = this.getTenantStore(tenantContext.tenantId);
    const results: MemoryRecord[] = [];

    for (const record of store.values()) {
      if (
        record.scopeContext.scope === scopeContext.scope &&
        record.scopeContext.scopeId === scopeContext.scopeId
      ) {
        if (includeDeleted || record.state !== 'DELETED') {
          results.push(record);
        }
      }
    }

    return Object.freeze(results);
  }
}

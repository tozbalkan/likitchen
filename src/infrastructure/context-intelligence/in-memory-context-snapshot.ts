import type { ContextSnapshotRepositoryPort } from '../../application/context-intelligence/ports/context-snapshot-repository-port';
import { ContextSnapshot } from '../../application/context-intelligence/domain/context-snapshot';
import { TenantContext } from '../../application/identity/tenant-context';

/**
 * In-memory adapter for ContextSnapshot persistence.
 * Tenant-partitioned storage with cross-tenant isolation checks.
 * Snapshots are immutable — saveSnapshot never overwrites an existing snapshot.
 */
export class InMemoryContextSnapshotAdapter implements ContextSnapshotRepositoryPort {
  private readonly snapshots = new Map<string, Map<string, ContextSnapshot>>();

  private getTenantStore(tenantId: string): Map<string, ContextSnapshot> {
    let store = this.snapshots.get(tenantId);
    if (!store) {
      store = new Map<string, ContextSnapshot>();
      this.snapshots.set(tenantId, store);
    }
    return store;
  }

  async saveSnapshot(
    tenantContext: Readonly<TenantContext>,
    snapshot: Readonly<ContextSnapshot>,
  ): Promise<void> {
    if (snapshot.tenantId !== tenantContext.tenantId) {
      throw new Error(
        `[InMemoryContextSnapshotAdapter] Security violation: Tenant '${tenantContext.tenantId}' cannot write snapshot for tenant '${snapshot.tenantId}'.`,
      );
    }

    const store = this.getTenantStore(tenantContext.tenantId);

    // Snapshots are immutable — do not overwrite existing
    if (store.has(snapshot.snapshotId)) {
      return; // Idempotent: already persisted
    }

    store.set(snapshot.snapshotId, snapshot as ContextSnapshot);
  }

  async findSnapshotById(
    tenantContext: Readonly<TenantContext>,
    snapshotId: string,
  ): Promise<ContextSnapshot | undefined> {
    const store = this.getTenantStore(tenantContext.tenantId);
    const snapshot = store.get(snapshotId);
    if (!snapshot) return undefined;
    if (snapshot.tenantId !== tenantContext.tenantId) return undefined;
    return snapshot;
  }

  async findSnapshotByRequestId(
    tenantContext: Readonly<TenantContext>,
    requestId: string,
  ): Promise<ContextSnapshot | undefined> {
    const store = this.getTenantStore(tenantContext.tenantId);
    for (const snapshot of store.values()) {
      if (
        snapshot.requestId === requestId &&
        snapshot.tenantId === tenantContext.tenantId
      ) {
        return snapshot;
      }
    }
    return undefined;
  }

  async findSnapshotsByPlanInstance(
    tenantContext: Readonly<TenantContext>,
    planInstanceId: string,
  ): Promise<ReadonlyArray<ContextSnapshot>> {
    const store = this.getTenantStore(tenantContext.tenantId);
    const results: ContextSnapshot[] = [];
    for (const snapshot of store.values()) {
      if (
        snapshot.planInstanceId === planInstanceId &&
        snapshot.tenantId === tenantContext.tenantId
      ) {
        results.push(snapshot);
      }
    }
    return Object.freeze(results);
  }
}

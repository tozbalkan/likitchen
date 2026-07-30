import { TenantContext } from '../../identity/tenant-context';
import { ContextSnapshot } from '../domain/context-snapshot';

/**
 * Port for persisting and retrieving immutable ContextSnapshots.
 * All operations enforce tenant isolation.
 */
export interface ContextSnapshotRepositoryPort {
  saveSnapshot(
    tenantContext: Readonly<TenantContext>,
    snapshot: Readonly<ContextSnapshot>,
  ): Promise<void>;

  findSnapshotById(
    tenantContext: Readonly<TenantContext>,
    snapshotId: string,
  ): Promise<ContextSnapshot | undefined>;

  findSnapshotByRequestId(
    tenantContext: Readonly<TenantContext>,
    requestId: string,
  ): Promise<ContextSnapshot | undefined>;

  findSnapshotsByPlanInstance(
    tenantContext: Readonly<TenantContext>,
    planInstanceId: string,
  ): Promise<ReadonlyArray<ContextSnapshot>>;
}

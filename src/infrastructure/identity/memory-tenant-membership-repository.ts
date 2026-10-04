import type { TenantMembershipRepositoryPort } from '../../application/identity/ports/tenant-membership-repository-port';
import type { TenantMembership } from '../../domain/identity/tenant-membership';

/**
 * Test-only in-memory adapter for deterministic unit testing.
 * MUST NEVER be used or imported in production composition paths.
 */
export class MemoryTenantMembershipRepository implements TenantMembershipRepositoryPort {
  private readonly memberships: TenantMembership[] = [];

  constructor(initialMemberships: readonly TenantMembership[] = []) {
    this.memberships = [...initialMemberships];
  }

  addMembership(membership: TenantMembership): void {
    this.memberships.push(membership);
  }

  async findActiveMembershipsByUserId(
    userId: string,
  ): Promise<TenantMembership[]> {
    return this.memberships.filter(
      (m) => m.userId === userId && m.status === 'ACTIVE',
    );
  }

  async findMembership(
    userId: string,
    tenantId: string,
  ): Promise<TenantMembership | null> {
    return (
      this.memberships.find(
        (m) => m.userId === userId && m.tenantId === tenantId,
      ) ?? null
    );
  }
}

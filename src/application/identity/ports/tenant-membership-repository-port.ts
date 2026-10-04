import type { TenantMembership } from '../../../domain/identity/tenant-membership';

export interface TenantMembershipRepositoryPort {
  /**
   * Retrieves all ACTIVE tenant memberships for the given user.
   * Inactive or suspended memberships must NOT be returned.
   */
  findActiveMembershipsByUserId(userId: string): Promise<TenantMembership[]>;

  /**
   * Retrieves a specific tenant membership for a user, regardless of status.
   */
  findMembership(
    userId: string,
    tenantId: string,
  ): Promise<TenantMembership | null>;
}

export type TenantRole = 'ADMIN' | 'OPERATOR' | 'AUDITOR' | 'VIEWER';

export type MembershipStatus = 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';

export interface TenantMembership {
  readonly id: string;
  readonly userId: string;
  readonly tenantId: string;
  readonly role: TenantRole;
  readonly status: MembershipStatus;
  readonly createdAt?: Date | string | undefined;
  readonly updatedAt?: Date | string | undefined;
}

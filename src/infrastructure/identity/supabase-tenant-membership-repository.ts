import type { SupabaseClient } from '@supabase/supabase-js';
import type { TenantMembershipRepositoryPort } from '../../application/identity/ports/tenant-membership-repository-port';
import type {
  TenantMembership,
  MembershipStatus,
  TenantRole,
} from '../../domain/identity/tenant-membership';

interface TenantMembershipRow {
  readonly id: string;
  readonly user_id: string;
  readonly tenant_id: string;
  readonly role: string;
  readonly status: string;
  readonly created_at?: string;
  readonly updated_at?: string;
}

export class SupabaseTenantMembershipRepository implements TenantMembershipRepositoryPort {
  constructor(private readonly supabaseClient: SupabaseClient) {}

  async findActiveMembershipsByUserId(
    userId: string,
  ): Promise<TenantMembership[]> {
    const { data, error } = await this.supabaseClient
      .from('tenant_memberships')
      .select('id, user_id, tenant_id, role, status, created_at, updated_at')
      .eq('user_id', userId)
      .eq('status', 'ACTIVE');

    if (error || !data) {
      return [];
    }

    const rows = data as unknown as TenantMembershipRow[];
    return rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      role: row.role as TenantRole,
      status: row.status as MembershipStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  }

  async findMembership(
    userId: string,
    tenantId: string,
  ): Promise<TenantMembership | null> {
    const { data, error } = await this.supabaseClient
      .from('tenant_memberships')
      .select('id, user_id, tenant_id, role, status, created_at, updated_at')
      .eq('user_id', userId)
      .eq('tenant_id', tenantId)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    const row = data as unknown as TenantMembershipRow;
    return {
      id: row.id,
      userId: row.user_id,
      tenantId: row.tenant_id,
      role: row.role as TenantRole,
      status: row.status as MembershipStatus,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

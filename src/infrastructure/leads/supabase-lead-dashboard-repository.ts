import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  LeadDashboardRepositoryPort,
  LeadDto,
} from '../../application/leads/ports/lead-dashboard-repository-port';

const LEAD_COLUMNS =
  'id, tenant_id, customer_name, phone, project_type, location, budget, timeline, status, human_takeover, created_at, conversations(score, readiness_status)';

interface ConversationScoreRow {
  readonly score: number | null;
  readonly readiness_status: string | null;
}

interface LeadRow {
  readonly id: string;
  readonly tenant_id: string;
  readonly customer_name: string | null;
  readonly phone: string;
  readonly project_type: string | null;
  readonly location: string | null;
  readonly budget: string | null;
  readonly timeline: string | null;
  readonly status: string;
  readonly human_takeover: boolean;
  readonly created_at: string;
  readonly conversations: ConversationScoreRow | ConversationScoreRow[] | null;
}

function toLeadDto(row: LeadRow): LeadDto {
  const conversation = Array.isArray(row.conversations)
    ? row.conversations[0]
    : row.conversations;
  return {
    id: row.id,
    tenantId: row.tenant_id,
    customerName: row.customer_name ?? '',
    phone: row.phone,
    projectType: row.project_type ?? '',
    location: row.location ?? '',
    budget: row.budget ?? '',
    timeline: row.timeline ?? '',
    score: conversation?.score ?? 0,
    readiness:
      conversation?.readiness_status === 'ready'
        ? 'READY_FOR_HANDOFF'
        : 'QUALIFYING',
    status: row.status,
    humanTakeover: row.human_takeover,
    createdAt: row.created_at,
  };
}

/**
 * Dashboard lead repository bound to the signed-in user's Supabase client.
 * Never constructed with the service-role key: RLS limits rows to the user's
 * ACTIVE tenant memberships and lead updates to ADMIN/OPERATOR members.
 * Errors are thrown, not mapped to empty results.
 */
export class SupabaseLeadDashboardRepository implements LeadDashboardRepositoryPort {
  constructor(private readonly userClient: SupabaseClient) {}

  async listLeads(tenantId: string): Promise<readonly LeadDto[]> {
    const { data, error } = await this.userClient
      .from('leads')
      .select(LEAD_COLUMNS)
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Lead list failed: ${error.message}`);
    return (data as unknown as LeadRow[]).map(toLeadDto);
  }

  async getLead(leadId: string): Promise<LeadDto | null> {
    const { data, error } = await this.userClient
      .from('leads')
      .select(LEAD_COLUMNS)
      .eq('id', leadId)
      .maybeSingle();
    if (error) throw new Error(`Lead lookup failed: ${error.message}`);
    return data ? toLeadDto(data as unknown as LeadRow) : null;
  }

  async setHumanTakeover(
    tenantId: string,
    leadId: string,
    humanTakeover: boolean,
  ): Promise<LeadDto | null> {
    const { data, error } = await this.userClient
      .from('leads')
      .update({ human_takeover: humanTakeover })
      .eq('id', leadId)
      .eq('tenant_id', tenantId)
      .select(LEAD_COLUMNS)
      .maybeSingle();
    if (error) throw new Error(`Lead takeover update failed: ${error.message}`);
    return data ? toLeadDto(data as unknown as LeadRow) : null;
  }
}

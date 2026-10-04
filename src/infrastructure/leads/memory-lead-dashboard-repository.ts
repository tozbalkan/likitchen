import type {
  LeadDashboardRepositoryPort,
  LeadDto,
} from '../../application/leads/ports/lead-dashboard-repository-port';

/** Test double for the dashboard lead repository. */
export class MemoryLeadDashboardRepository implements LeadDashboardRepositoryPort {
  private readonly leads: Map<string, LeadDto>;

  constructor(initial: readonly LeadDto[] = []) {
    this.leads = new Map(initial.map((lead) => [lead.id, lead]));
  }

  async listLeads(tenantId: string): Promise<readonly LeadDto[]> {
    return Array.from(this.leads.values())
      .filter((lead) => lead.tenantId === tenantId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async getLead(leadId: string): Promise<LeadDto | null> {
    return this.leads.get(leadId) ?? null;
  }

  async setHumanTakeover(
    tenantId: string,
    leadId: string,
    humanTakeover: boolean,
  ): Promise<LeadDto | null> {
    const existing = this.leads.get(leadId);
    if (!existing || existing.tenantId !== tenantId) return null;
    const updated: LeadDto = { ...existing, humanTakeover };
    this.leads.set(leadId, updated);
    return updated;
  }
}

export type LeadReadiness = 'READY_FOR_HANDOFF' | 'QUALIFYING';

export interface LeadDto {
  readonly id: string;
  readonly tenantId: string;
  readonly customerName: string;
  readonly phone: string;
  readonly projectType: string;
  readonly location: string;
  readonly budget: string;
  readonly timeline: string;
  readonly score: number;
  readonly readiness: LeadReadiness;
  readonly status: string;
  readonly humanTakeover: boolean;
  readonly createdAt: string;
}

/**
 * Lead access for the sales rep dashboard.
 * Production implementations run under the signed-in user's session, so database RLS
 * applies in addition to the application-level tenant and role checks.
 */
export interface LeadDashboardRepositoryPort {
  /** Leads of one tenant, newest first. */
  listLeads(tenantId: string): Promise<readonly LeadDto[]>;

  /** A single lead visible to the caller, or null. */
  getLead(leadId: string): Promise<LeadDto | null>;

  /** Updates the takeover flag of a lead in the given tenant; null if no row was updated. */
  setHumanTakeover(
    tenantId: string,
    leadId: string,
    humanTakeover: boolean,
  ): Promise<LeadDto | null>;
}

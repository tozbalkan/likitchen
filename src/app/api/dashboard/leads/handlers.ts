import { NextResponse, type NextRequest } from 'next/server';
import { TenantContext } from '../../../../application/identity/tenant-context';
import {
  UseCaseGuard,
  UnauthorizedException,
} from '../../../../application/identity/auth/use-case-guard';
import { RolePermissionEvaluator } from '../../../../application/identity/auth/role-permission-evaluator';
import { getAuthenticatedUser } from '../../../../infrastructure/auth/supabase-server';
import { SupabaseTenantMembershipRepository } from '../../../../infrastructure/identity/supabase-tenant-membership-repository';
import type { TenantMembershipRepositoryPort } from '../../../../application/identity/ports/tenant-membership-repository-port';
import type { TenantMembership } from '../../../../domain/identity/tenant-membership';
import type {
  LeadDashboardRepositoryPort,
  LeadDto,
} from '../../../../application/leads/ports/lead-dashboard-repository-port';
import { SupabaseLeadDashboardRepository } from '../../../../infrastructure/leads/supabase-lead-dashboard-repository';

export type { LeadDto };

export interface DashboardRouteDependencies {
  readonly verifyUser?: (
    request: NextRequest,
  ) => Promise<{ id: string; email?: string } | null>;
  readonly membershipRepo?: TenantMembershipRepositoryPort;
  readonly leadRepo?: LeadDashboardRepositoryPort;
}

interface ResolvedAuthContext {
  readonly context: TenantContext;
  readonly membership: TenantMembership;
  readonly availableTenants: readonly string[];
  readonly leadRepo: LeadDashboardRepositoryPort;
}

type AuthResolutionResult =
  | { readonly success: true; readonly data: ResolvedAuthContext }
  | { readonly success: false; readonly response: NextResponse };

/**
 * Resolves authenticated user identity and verifies active tenant membership.
 * Never trusts unverified client claims, headers, or query parameters.
 */
async function resolveAuthenticatedTenant(
  request: NextRequest,
  deps?: DashboardRouteDependencies,
): Promise<AuthResolutionResult> {
  // 1. Authenticate user identity
  let userId: string | null = null;
  let repo: TenantMembershipRepositoryPort | null = null;
  let leadRepo: LeadDashboardRepositoryPort | null = null;

  if (deps?.verifyUser) {
    const verified = await deps.verifyUser(request);
    if (!verified) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized: Missing or invalid authentication token' },
          { status: 401 },
        ),
      };
    }
    userId = verified.id;
    repo = deps.membershipRepo ?? null;
    leadRepo = deps.leadRepo ?? null;
  } else {
    const authResult = await getAuthenticatedUser(request);
    if (!authResult) {
      return {
        success: false,
        response: NextResponse.json(
          { error: 'Unauthorized: Missing or invalid authentication token' },
          { status: 401 },
        ),
      };
    }
    userId = authResult.user.id;
    repo =
      deps?.membershipRepo ??
      new SupabaseTenantMembershipRepository(authResult.client);
    // Bound to the user's session (never the service role) so RLS applies.
    leadRepo =
      deps?.leadRepo ?? new SupabaseLeadDashboardRepository(authResult.client);
  }

  if (!repo || !leadRepo) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal Server Error: Repository unavailable' },
        { status: 500 },
      ),
    };
  }

  // 2. Query user's ACTIVE memberships under user-session RLS
  const activeMemberships = await repo.findActiveMembershipsByUserId(userId);
  if (activeMemberships.length === 0) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Forbidden: User has no active tenant memberships' },
        { status: 403 },
      ),
    };
  }

  // 3. Tenant Selection Validation
  const requestedTenantId = request.nextUrl.searchParams
    .get('tenantId')
    ?.trim();
  let selectedMembership: TenantMembership;

  if (requestedTenantId) {
    const matching = activeMemberships.find(
      (m) => m.tenantId === requestedTenantId,
    );
    if (!matching) {
      return {
        success: false,
        response: NextResponse.json(
          {
            error:
              'Forbidden: Access to requested tenant denied. User is not an active member of this tenant.',
          },
          { status: 403 },
        ),
      };
    }
    selectedMembership = matching;
  } else {
    if (activeMemberships.length === 1 && activeMemberships[0]) {
      selectedMembership = activeMemberships[0];
    } else {
      return {
        success: false,
        response: NextResponse.json(
          {
            error:
              'Bad Request: Multiple tenant memberships found. Explicit tenant selection required via ?tenantId=<id>',
            availableTenants: activeMemberships.map((m) => m.tenantId),
          },
          { status: 400 },
        ),
      };
    }
  }

  // 4. Build TenantContext
  const context = TenantContext.create({
    tenantId: selectedMembership.tenantId,
    organizationId: 'org-default',
    workspaceId: 'ws-default',
    environment: 'production',
    region: 'us-east-1',
  });

  return {
    success: true,
    data: {
      context,
      membership: selectedMembership,
      availableTenants: activeMemberships.map((m) => m.tenantId),
      leadRepo,
    },
  };
}

export async function handleGet(
  request: NextRequest,
  deps?: DashboardRouteDependencies,
): Promise<NextResponse> {
  const authResolution = await resolveAuthenticatedTenant(request, deps);
  if (!authResolution.success) {
    return authResolution.response;
  }

  const { context, membership, availableTenants, leadRepo } =
    authResolution.data;

  // Evaluate RBAC via UseCaseGuard using membership role
  const evaluator = new RolePermissionEvaluator(membership.role);
  const useCaseGuard = new UseCaseGuard(evaluator);

  try {
    await useCaseGuard.authorize(context, 'dashboard.leads.read');
  } catch (err: unknown) {
    if (err instanceof UnauthorizedException) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Authorization error' }, { status: 403 });
  }

  let leads: readonly LeadDto[];
  try {
    leads = await leadRepo.listLeads(context.tenantId);
  } catch (err: unknown) {
    console.error(
      '[dashboard-leads] Lead list failed:',
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json(
      { error: 'Leads could not be loaded' },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      // Defense in depth: never return rows of another tenant even if a repository misbehaves.
      leads: leads.filter((lead) => lead.tenantId === context.tenantId),
      selectedTenantId: context.tenantId,
      role: membership.role,
      availableTenants,
    },
    { status: 200 },
  );
}

export async function handlePost(
  request: NextRequest,
  deps?: DashboardRouteDependencies,
): Promise<NextResponse> {
  const authResolution = await resolveAuthenticatedTenant(request, deps);
  if (!authResolution.success) {
    return authResolution.response;
  }

  const { context, membership, leadRepo } = authResolution.data;

  // Evaluate RBAC via UseCaseGuard using membership role
  const evaluator = new RolePermissionEvaluator(membership.role);
  const useCaseGuard = new UseCaseGuard(evaluator);

  try {
    await useCaseGuard.authorize(context, 'dashboard.leads.takeover');
  } catch (err: unknown) {
    if (err instanceof UnauthorizedException) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Authorization error' }, { status: 403 });
  }

  let body: { leadId?: unknown; humanTakeover?: unknown; tenantId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }

  try {
    if (
      typeof body.leadId !== 'string' ||
      !body.leadId ||
      typeof body.humanTakeover !== 'boolean'
    ) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    if (body.tenantId && body.tenantId !== context.tenantId) {
      return NextResponse.json(
        {
          error:
            'Forbidden: Access to requested tenant denied. User is not an active member of this tenant.',
        },
        { status: 403 },
      );
    }

    const existing = await leadRepo.getLead(body.leadId);
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Cross-tenant mutation check
    if (existing.tenantId !== context.tenantId) {
      return NextResponse.json(
        { error: 'Forbidden: Cross-tenant lead mutation denied' },
        { status: 403 },
      );
    }

    const updated = await leadRepo.setHumanTakeover(
      context.tenantId,
      body.leadId,
      body.humanTakeover,
    );
    if (!updated) {
      // RLS rejected the update or the row disappeared meanwhile.
      return NextResponse.json(
        { error: 'Forbidden: Lead could not be updated' },
        { status: 403 },
      );
    }

    return NextResponse.json({ success: true, lead: updated }, { status: 200 });
  } catch (err: unknown) {
    console.error(
      '[dashboard-leads] Takeover update failed:',
      err instanceof Error ? err.message : err,
    );
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

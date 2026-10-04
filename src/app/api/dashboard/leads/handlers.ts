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

export interface LeadDto {
  id: string;
  tenantId: string;
  customerName: string;
  phone: string;
  projectType: string;
  location: string;
  budget: string;
  score: number;
  readiness: string;
  humanTakeover: boolean;
}

export interface DashboardRouteDependencies {
  readonly verifyUser?: (
    request: NextRequest,
  ) => Promise<{ id: string; email?: string } | null>;
  readonly membershipRepo?: TenantMembershipRepositoryPort;
}

// Global server-side tenant-isolated lead store for live dashboard persistence
const LIVE_LEADS_STORE = new Map<string, LeadDto>([
  [
    'lead-101',
    {
      id: 'lead-101',
      tenantId: 'tenant-alpha',
      customerName: 'Sarah Jenkins',
      phone: '+1 (555) 234-5678',
      projectType: 'Full Kitchen Remodel',
      location: 'Nassau County, NY',
      budget: '$40,000 – $60,000',
      score: 88,
      readiness: 'READY_FOR_HANDOFF',
      humanTakeover: false,
    },
  ],
  [
    'lead-102',
    {
      id: 'lead-102',
      tenantId: 'tenant-beta',
      customerName: 'Michael Chang',
      phone: '+1 (555) 876-5432',
      projectType: 'Master Bathroom Remodel',
      location: 'Brooklyn, NY',
      budget: '$25,000 – $35,000',
      score: 92,
      readiness: 'READY_FOR_HANDOFF',
      humanTakeover: true,
    },
  ],
]);

interface ResolvedAuthContext {
  readonly context: TenantContext;
  readonly membership: TenantMembership;
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
  }

  if (!repo) {
    return {
      success: false,
      response: NextResponse.json(
        { error: 'Internal Server Error: Membership repository unavailable' },
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

  const { context, membership } = authResolution.data;

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

  // Tenant-isolated lead filtering
  const allLeads = Array.from(LIVE_LEADS_STORE.values());
  const tenantLeads = allLeads.filter(
    (lead) => lead.tenantId === context.tenantId,
  );

  return NextResponse.json(
    {
      leads: tenantLeads,
      selectedTenantId: context.tenantId,
      role: membership.role,
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

  const { context, membership } = authResolution.data;

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

  try {
    const body = (await request.json()) as {
      leadId?: string;
      humanTakeover?: boolean;
      tenantId?: string;
    };

    if (!body.leadId || typeof body.humanTakeover !== 'boolean') {
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

    const existing = LIVE_LEADS_STORE.get(body.leadId);
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

    const updated: LeadDto = {
      ...existing,
      humanTakeover: body.humanTakeover,
    };
    LIVE_LEADS_STORE.set(body.leadId, updated);

    return NextResponse.json({ success: true, lead: updated }, { status: 200 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

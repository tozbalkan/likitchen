import { NextResponse, type NextRequest } from 'next/server';
import { TenantContext } from '../../../../application/identity/tenant-context';
import {
  UseCaseGuard,
  UnauthorizedException,
} from '../../../../application/identity/auth/use-case-guard';
import { MemoryPermissionEvaluatorAdapter } from '../../../../infrastructure/identity/memory-permission-evaluator';
import {
  getJwtSigningKey,
  verifySignedDashboardToken,
} from '../../../../infrastructure/identity/dashboard-token-service';

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

// Memory permission evaluator configured with role mappings
const permissionEvaluator = new MemoryPermissionEvaluatorAdapter({
  'tenant-alpha': 'OPERATOR',
  'tenant-beta': 'OPERATOR',
  'tenant-restricted': 'UNAUTHORIZED_ROLE',
  'tenant-viewer': 'VIEWER',
});
const useCaseGuard = new UseCaseGuard(permissionEvaluator);

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

/**
 * Cryptographically verifies and extracts TenantContext from HTTP Request.
 * Raw unverified x-tenant-id headers or unverified Bearer tokens are REJECTED.
 * Fails closed if JWT_SIGNING_KEY environment secret is missing.
 */
function extractAuthenticatedTenantContext(
  request: NextRequest,
): TenantContext | null {
  const signingSecret = getJwtSigningKey();
  if (!signingSecret) {
    return null; // Fail closed in production when JWT_SIGNING_KEY is missing
  }

  const authHeader = request.headers.get('authorization');

  // Must present a Bearer token
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null; // Unauthenticated: missing Bearer token header
  }

  const rawToken = authHeader.replace('Bearer ', '').trim();
  const verified = verifySignedDashboardToken(rawToken, signingSecret);

  if (!verified) {
    return null; // Unauthenticated: invalid, tampered, or expired token
  }

  return TenantContext.create({
    tenantId: verified.tenantId,
    organizationId: 'org-default',
    workspaceId: 'ws-default',
    environment: 'production',
    region: 'us-east-1',
  });
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const context = extractAuthenticatedTenantContext(request);

  // 1. Authenticated Check (HTTP 401)
  if (!context) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing or invalid authentication token' },
      { status: 401 },
    );
  }

  // 2. Authorization Check (HTTP 403)
  try {
    await useCaseGuard.authorize(context, 'dashboard.leads.read');
  } catch (err: unknown) {
    if (err instanceof UnauthorizedException) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json({ error: 'Authorization error' }, { status: 403 });
  }

  // 3. Tenant Isolation Filtering
  const allLeads = Array.from(LIVE_LEADS_STORE.values());
  const tenantLeads = allLeads.filter(
    (lead) => lead.tenantId === context.tenantId,
  );

  return NextResponse.json({ leads: tenantLeads }, { status: 200 });
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const context = extractAuthenticatedTenantContext(request);

  // 1. Authenticated Check (HTTP 401)
  if (!context) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing or invalid authentication token' },
      { status: 401 },
    );
  }

  // 2. Authorization Check (HTTP 403)
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
    };

    if (!body.leadId || typeof body.humanTakeover !== 'boolean') {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const existing = LIVE_LEADS_STORE.get(body.leadId);
    if (!existing) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // 3. Cross-Tenant Access Enforcement (HTTP 403)
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

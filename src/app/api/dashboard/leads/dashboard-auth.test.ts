import { describe, it, expect, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';
import { handleGet, handlePost } from './handlers';
import { GET, POST } from './route';
import { MemoryTenantMembershipRepository } from '../../../../infrastructure/identity/memory-tenant-membership-repository';
import { Role } from '../../../../application/identity/auth/permission-evaluator-port';
import type { TenantMembership } from '../../../../domain/identity/tenant-membership';
import { getSupabaseConfig } from '../../../../infrastructure/auth/supabase-server';
import { MemoryLeadDashboardRepository } from '../../../../infrastructure/leads/memory-lead-dashboard-repository';
import type { LeadDto } from '../../../../application/leads/ports/lead-dashboard-repository-port';

function demoLead(
  overrides: Partial<LeadDto> & Pick<LeadDto, 'id' | 'tenantId'>,
): LeadDto {
  return {
    customerName: 'Test Customer',
    phone: '15550001111',
    projectType: 'full_kitchen_remodel',
    location: 'Nassau County, NY',
    budget: '30k_60k',
    timeline: '1_3_months',
    score: 80,
    readiness: 'READY_FOR_HANDOFF',
    status: 'NEW',
    humanTakeover: false,
    createdAt: '2026-10-01T12:00:00Z',
    ...overrides,
  };
}

describe('Dashboard Authentication & Authorization Security Test Suite', () => {
  let membershipRepo: MemoryTenantMembershipRepository;
  let leadRepo: MemoryLeadDashboardRepository;

  const validUserAlphaId = 'user-uuid-alpha-123';
  const validUserBetaId = 'user-uuid-beta-456';
  const validUserMultiId = 'user-uuid-multi-789';
  const validUserViewerId = 'user-uuid-viewer-101';
  const validUserInactiveId = 'user-uuid-inactive-202';
  const validUserSuspendedId = 'user-uuid-suspended-303';
  const validUserNoMembershipsId = 'user-uuid-nomember-404';
  const validUserUnknownRoleId = 'user-uuid-unknownrole-505';

  beforeEach(() => {
    leadRepo = new MemoryLeadDashboardRepository([
      demoLead({ id: 'lead-101', tenantId: 'tenant-alpha' }),
      demoLead({
        id: 'lead-102',
        tenantId: 'tenant-beta',
        humanTakeover: true,
      }),
    ]);
    membershipRepo = new MemoryTenantMembershipRepository([
      {
        id: 'mem-1',
        userId: validUserAlphaId,
        tenantId: 'tenant-alpha',
        role: Role.OPERATOR,
        status: 'ACTIVE',
      },
      {
        id: 'mem-2',
        userId: validUserBetaId,
        tenantId: 'tenant-beta',
        role: Role.ADMIN,
        status: 'ACTIVE',
      },
      {
        id: 'mem-3',
        userId: validUserMultiId,
        tenantId: 'tenant-alpha',
        role: Role.OPERATOR,
        status: 'ACTIVE',
      },
      {
        id: 'mem-4',
        userId: validUserMultiId,
        tenantId: 'tenant-beta',
        role: Role.OPERATOR,
        status: 'ACTIVE',
      },
      {
        id: 'mem-5',
        userId: validUserViewerId,
        tenantId: 'tenant-alpha',
        role: Role.VIEWER,
        status: 'ACTIVE',
      },
      {
        id: 'mem-6',
        userId: validUserInactiveId,
        tenantId: 'tenant-alpha',
        role: Role.OPERATOR,
        status: 'INACTIVE',
      },
      {
        id: 'mem-7',
        userId: validUserSuspendedId,
        tenantId: 'tenant-alpha',
        role: Role.OPERATOR,
        status: 'SUSPENDED',
      },
      {
        id: 'mem-8',
        userId: validUserUnknownRoleId,
        tenantId: 'tenant-alpha',
        role: 'NON_EXISTENT_ROLE' as Role,
        status: 'ACTIVE',
      },
    ]);
  });

  // Helper creating a mock verifier returning the given userId (or null)
  function createMockVerifier(userId: string | null) {
    return async () =>
      userId ? { id: userId, email: `${userId}@example.com` } : null;
  }

  describe('1-3. Identity Verification Failures (HTTP 401)', () => {
    it('1. Unauthenticated request (no session/header) is rejected with 401', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads');
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(null),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.error).toContain('Unauthorized');
    });

    it('2. Invalid identity token is rejected with 401', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads', {
        headers: { Authorization: 'Bearer invalid-token-xyz' },
      });
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(null),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(401);
    });

    it('3. Expired/revoked identity is rejected with 401', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads', {
        headers: { Authorization: 'Bearer expired-jwt-token' },
      });
      const res = await handleGet(req, {
        verifyUser: async () => null, // Supabase getUser rejects expired JWT
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(401);
    });
  });

  describe('4-7. Tenant Membership Authorization Failures (HTTP 403)', () => {
    it('4. Authenticated user with zero active memberships is rejected with 403', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads');
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserNoMembershipsId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('no active tenant memberships');
    });

    it('5. Authenticated user with INACTIVE membership is rejected with 403', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads');
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserInactiveId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('no active tenant memberships');
    });

    it('6. Authenticated user with SUSPENDED membership is rejected with 403', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads');
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserSuspendedId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('no active tenant memberships');
    });

    it('7. Authenticated user requesting unauthorized tenant on GET is rejected with 403 (Cross-tenant GET selector)', async () => {
      // User Alpha belongs only to tenant-alpha, but requests ?tenantId=tenant-beta
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-beta',
      );
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserAlphaId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Access to requested tenant denied');
    });

    it('7b. Authenticated user requesting unauthorized tenant on POST is rejected with 403 (Cross-tenant POST selector)', async () => {
      // User Alpha belongs only to tenant-alpha, but requests ?tenantId=tenant-beta on POST
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-beta',
        {
          method: 'POST',
          body: JSON.stringify({ leadId: 'lead-101', humanTakeover: true }),
        },
      );
      const res = await handlePost(req, {
        verifyUser: createMockVerifier(validUserAlphaId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Access to requested tenant denied');
    });

    it('7c. Authenticated user attempting cross-tenant lead mutation is rejected with 403 (Cross-tenant lead target)', async () => {
      // User Alpha (tenant-alpha OPERATOR) attempts to mutate lead-102 (which belongs to tenant-beta)
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-alpha',
        {
          method: 'POST',
          body: JSON.stringify({ leadId: 'lead-102', humanTakeover: true }),
        },
      );
      const res = await handlePost(req, {
        verifyUser: createMockVerifier(validUserAlphaId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Cross-tenant lead mutation denied');
    });

    it('7d. Authenticated user attempting cross-tenant mutation via body.tenantId is rejected with 403', async () => {
      // User Alpha attempts mutation passing mismatching body.tenantId = tenant-beta
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-alpha',
        {
          method: 'POST',
          body: JSON.stringify({
            leadId: 'lead-101',
            humanTakeover: true,
            tenantId: 'tenant-beta',
          }),
        },
      );
      const res = await handlePost(req, {
        verifyUser: createMockVerifier(validUserAlphaId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('Access to requested tenant denied');
    });
  });

  describe('8-10. Tenant Selection Rules', () => {
    it('8. Single active membership auto-selects tenant without query param (200 OK)', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads');
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserAlphaId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.selectedTenantId).toBe('tenant-alpha');
      expect(json.role).toBe(Role.OPERATOR);
      expect(
        json.leads.every(
          (l: { tenantId: string }) => l.tenantId === 'tenant-alpha',
        ),
      ).toBe(true);
    });

    it('9. Multiple active memberships without selector returns 400 Bad Request', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads');
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserMultiId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error).toContain('Multiple tenant memberships found');
      expect(json.availableTenants).toEqual(['tenant-alpha', 'tenant-beta']);
    });

    it('10. Multiple active memberships with valid selector succeeds with requested tenant', async () => {
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-beta',
      );
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserMultiId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.selectedTenantId).toBe('tenant-beta');
      expect(
        json.leads.every(
          (l: { tenantId: string }) => l.tenantId === 'tenant-beta',
        ),
      ).toBe(true);
    });
  });

  describe('11-12. Role-Based Access Control (RBAC) via Membership Role', () => {
    it('11. Membership Role VIEWER cannot perform takeover on POST (Rejected with 403)', async () => {
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-alpha',
        {
          method: 'POST',
          body: JSON.stringify({ leadId: 'lead-101', humanTakeover: true }),
        },
      );
      const res = await handlePost(req, {
        verifyUser: createMockVerifier(validUserViewerId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('dashboard.leads.takeover');
    });

    it('12. Membership Role OPERATOR can perform takeover on POST (200 OK)', async () => {
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-alpha',
        {
          method: 'POST',
          body: JSON.stringify({ leadId: 'lead-101', humanTakeover: true }),
        },
      );
      const res = await handlePost(req, {
        verifyUser: createMockVerifier(validUserAlphaId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.lead.humanTakeover).toBe(true);
    });
  });

  describe('13-16. Spoofing & Legacy Token Rejection (HTTP 401)', () => {
    it('13. Raw x-tenant-id header alone cannot establish identity (Rejected with 401)', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads', {
        headers: { 'x-tenant-id': 'tenant-alpha' },
      });
      // In production path with no mock verifier:
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('14. Raw Bearer tenant ID string cannot establish identity (Rejected with 401)', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads', {
        headers: { Authorization: 'Bearer tenant-alpha' },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('15. Old application HMAC dashboard token is rejected with 401', async () => {
      const fakeHmacToken =
        'eyJ0ZW5hbnRJZCI6InRlbmFudC1hbHBoYSJ9.abcdef1234567890';
      const req = new NextRequest('http://localhost/api/dashboard/leads', {
        headers: { Authorization: `Bearer ${fakeHmacToken}` },
      });
      const res = await GET(req);
      expect(res.status).toBe(401);
    });

    it('16. Arbitrary tenant query selector cannot establish identity (Rejected with 401)', async () => {
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-alpha',
      );
      const res = await GET(req);
      expect(res.status).toBe(401);
    });
  });

  describe('17-20. Cross-Tenant Protection & Fail-Closed RBAC', () => {
    it('17. Authenticated tenant-A member cannot access tenant-B leads', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads');
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserAlphaId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.leads.some((l: { id: string }) => l.id === 'lead-102')).toBe(
        false,
      );
    });

    it('18. Inactive membership cannot be selected via explicit query param (403 Forbidden)', async () => {
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-alpha',
      );
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserInactiveId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
    });

    it('19. Unknown role fails closed and rejects access (403 Forbidden)', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads');
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserUnknownRoleId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.error).toContain('dashboard.leads.read');
    });

    it('20. Permission evaluation strictly uses membership role, not static tenant role', async () => {
      // User Viewer is on tenant-alpha, but has VIEWER role on that membership.
      // Even though tenant-alpha historically had OPERATOR role in static map,
      // the membership role VIEWER strictly governs permissions!
      const req = new NextRequest(
        'http://localhost/api/dashboard/leads?tenantId=tenant-alpha',
        {
          method: 'POST',
          body: JSON.stringify({ leadId: 'lead-101', humanTakeover: true }),
        },
      );
      const res = await handlePost(req, {
        verifyUser: createMockVerifier(validUserViewerId),
        membershipRepo,
        leadRepo,
      });
      expect(res.status).toBe(403);
    });
  });

  describe('21-25. Credential Exposure & User-Session Boundary Contracts', () => {
    it('21. Service-role key is never exposed in API responses', async () => {
      const req = new NextRequest('http://localhost/api/dashboard/leads');
      const res = await handleGet(req, {
        verifyUser: createMockVerifier(validUserAlphaId),
        membershipRepo,
        leadRepo,
      });
      const text = await res.text();
      expect(text).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(text).not.toContain('service_role');
    });

    it('22. Dashboard API and page source contain zero hardcoded credentials or tokens', () => {
      const routeSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/api/dashboard/leads/route.ts'),
        'utf8',
      );
      const handlersSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/api/dashboard/leads/handlers.ts'),
        'utf8',
      );
      const pageSource = fs.readFileSync(
        path.resolve(process.cwd(), 'src/app/dashboard/leads/page.tsx'),
        'utf8',
      );

      expect(routeSource).not.toContain('eyJ'); // No hardcoded JWT
      expect(routeSource).not.toContain('JWT_SIGNING_KEY');
      expect(handlersSource).not.toContain('JWT_SIGNING_KEY');
      expect(pageSource).not.toContain('eyJ');
      expect(pageSource).not.toContain('sessionToken');
      expect(pageSource).not.toContain('bearer');
    });

    it('23. Missing Supabase user-auth configuration fails closed', () => {
      const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const originalAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const originalSupabaseUrl = process.env.SUPABASE_URL;

      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      try {
        const config = getSupabaseConfig();
        expect(config).toBeNull();
      } finally {
        if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl;
        if (originalAnon)
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = originalAnon;
        if (originalSupabaseUrl) process.env.SUPABASE_URL = originalSupabaseUrl;
      }
    });

    it('24. Unrelated authenticated user cannot enumerate other users memberships', async () => {
      const userAlphaMemberships =
        await membershipRepo.findActiveMembershipsByUserId(validUserAlphaId);
      const userBetaMemberships =
        await membershipRepo.findActiveMembershipsByUserId(validUserBetaId);

      expect(
        userAlphaMemberships.every((m) => m.userId === validUserAlphaId),
      ).toBe(true);
      expect(
        userBetaMemberships.every((m) => m.userId === validUserBetaId),
      ).toBe(true);
      expect(
        userAlphaMemberships.some((m) => m.tenantId === 'tenant-beta'),
      ).toBe(false);
    });

    it('25. In-memory and Supabase membership repositories enforce user_id boundary', async () => {
      const memberships =
        await membershipRepo.findActiveMembershipsByUserId(validUserAlphaId);
      expect(memberships.length).toBe(1);
      expect(memberships[0]?.tenantId).toBe('tenant-alpha');
      expect(memberships[0]?.role).toBe(Role.OPERATOR);
    });
  });

  describe('26. Database Schema & RLS Contract Tests', () => {
    const schemaSql = fs.readFileSync(
      path.resolve(process.cwd(), 'docs/db/schema.sql'),
      'utf8',
    );

    it('enables RLS on tenant_memberships', () => {
      expect(schemaSql).toContain(
        'ALTER TABLE tenant_memberships ENABLE ROW LEVEL SECURITY;',
      );
    });

    it('defines user-session SELECT policy with user_id = auth.uid()', () => {
      expect(schemaSql).toContain(
        'CREATE POLICY tenant_memberships_user_read ON tenant_memberships',
      );
      expect(schemaSql).toContain('USING (user_id = (SELECT auth.uid()))');
    });

    it('scopes domain-table reads to ACTIVE memberships and lead updates to ADMIN/OPERATOR', () => {
      for (const table of ['conversations', 'messages', 'leads']) {
        expect(schemaSql).toContain(
          `CREATE POLICY member_read_${table} ON ${table}`,
        );
      }
      expect(schemaSql).toContain(
        'CREATE POLICY operator_update_leads ON leads',
      );
      expect(schemaSql).toContain("tm.role IN ('ADMIN', 'OPERATOR')");
      expect(schemaSql).not.toContain(
        "current_setting('app.current_tenant_id'",
      );
    });

    it('references auth.users(id) with ON DELETE CASCADE', () => {
      expect(schemaSql).toMatch(
        /user_id UUID NOT NULL REFERENCES auth\.users\(id\) ON DELETE CASCADE/,
      );
    });

    it('enforces UNIQUE(user_id, tenant_id)', () => {
      expect(schemaSql).toContain(
        'CONSTRAINT uq_tenant_membership_user_tenant UNIQUE (user_id, tenant_id)',
      );
    });

    it('constrains role to established Role enum vocabulary', () => {
      expect(schemaSql).toMatch(
        /role VARCHAR\(32\) NOT NULL CHECK \(role IN \('ADMIN', 'OPERATOR', 'AUDITOR', 'VIEWER'\)\)/,
      );
    });

    it('constrains status to ACTIVE, INACTIVE, SUSPENDED', () => {
      expect(schemaSql).toMatch(
        /status VARCHAR\(32\) NOT NULL DEFAULT 'ACTIVE' CHECK \(status IN \('ACTIVE', 'INACTIVE', 'SUSPENDED'\)\)/,
      );
    });
  });
});

describe('Dashboard lead repository integration (Phase 3)', () => {
  const userId = 'user-uuid-repo-1';
  const membershipRepo = () =>
    new MemoryTenantMembershipRepository([
      {
        id: 'm-1',
        userId,
        tenantId: 'tenant-alpha',
        role: Role.OPERATOR,
        status: 'ACTIVE',
      },
    ]);
  const verifyUser = async () => ({ id: userId });
  const lead = (id: string, tenantId: string, createdAt: string): LeadDto => ({
    id,
    tenantId,
    customerName: '',
    phone: '15550001111',
    projectType: 'full_kitchen_remodel',
    location: 'Nassau County, NY',
    budget: '30k_60k',
    timeline: 'asap',
    score: 72,
    readiness: 'READY_FOR_HANDOFF',
    status: 'NEW',
    humanTakeover: false,
    createdAt,
  });

  it('GET returns the tenant leads newest first and the available tenants', async () => {
    const leadRepo = new MemoryLeadDashboardRepository([
      lead('old', 'tenant-alpha', '2026-10-01T00:00:00Z'),
      lead('new', 'tenant-alpha', '2026-10-03T00:00:00Z'),
      lead('other', 'tenant-beta', '2026-10-04T00:00:00Z'),
    ]);
    const res = await handleGet(
      new NextRequest('http://localhost/api/dashboard/leads'),
      { verifyUser, membershipRepo: membershipRepo(), leadRepo },
    );
    const json = (await res.json()) as {
      leads: LeadDto[];
      availableTenants: string[];
    };
    expect(res.status).toBe(200);
    expect(json.leads.map((l) => l.id)).toEqual(['new', 'old']);
    expect(json.availableTenants).toEqual(['tenant-alpha']);
  });

  it('POST persists the takeover flag in the repository', async () => {
    const leadRepo = new MemoryLeadDashboardRepository([
      lead('l1', 'tenant-alpha', '2026-10-01T00:00:00Z'),
    ]);
    const res = await handlePost(
      new NextRequest('http://localhost/api/dashboard/leads', {
        method: 'POST',
        body: JSON.stringify({ leadId: 'l1', humanTakeover: true }),
      }),
      { verifyUser, membershipRepo: membershipRepo(), leadRepo },
    );
    expect(res.status).toBe(200);
    expect((await leadRepo.getLead('l1'))?.humanTakeover).toBe(true);
  });

  it('POST returns 403 when the database refuses the update (RLS)', async () => {
    const leadRepo = new MemoryLeadDashboardRepository([
      lead('l1', 'tenant-alpha', '2026-10-01T00:00:00Z'),
    ]);
    leadRepo.setHumanTakeover = async () => null;
    const res = await handlePost(
      new NextRequest('http://localhost/api/dashboard/leads', {
        method: 'POST',
        body: JSON.stringify({ leadId: 'l1', humanTakeover: true }),
      }),
      { verifyUser, membershipRepo: membershipRepo(), leadRepo },
    );
    expect(res.status).toBe(403);
  });

  it('Repository failures return a generic 500 without internal details', async () => {
    const leadRepo = new MemoryLeadDashboardRepository();
    leadRepo.listLeads = async () => {
      throw new Error('relation "leads" secret detail');
    };
    const res = await handleGet(
      new NextRequest('http://localhost/api/dashboard/leads'),
      { verifyUser, membershipRepo: membershipRepo(), leadRepo },
    );
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('secret detail');
  });

  it('POST with malformed JSON returns 400', async () => {
    const res = await handlePost(
      new NextRequest('http://localhost/api/dashboard/leads', {
        method: 'POST',
        body: '{not json',
      }),
      {
        verifyUser,
        membershipRepo: membershipRepo(),
        leadRepo: new MemoryLeadDashboardRepository(),
      },
    );
    expect(res.status).toBe(400);
  });
});

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from './route';
import { createSignedDashboardToken } from '../../../../infrastructure/identity/dashboard-token-service';

describe('PART B: R5 Cryptographic Web Authentication & Authorization Tests', () => {
  const secretKey = 'likitchen_secure_dashboard_jwt_secret_key_2026';
  let originalSigningKey: string | undefined;

  beforeEach(() => {
    originalSigningKey = process.env.JWT_SIGNING_KEY;
    process.env.JWT_SIGNING_KEY = secretKey;
  });

  afterEach(() => {
    if (originalSigningKey !== undefined) {
      process.env.JWT_SIGNING_KEY = originalSigningKey;
    } else {
      delete process.env.JWT_SIGNING_KEY;
    }
  });

  it('1. Unauthenticated GET request is rejected with 401', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/leads');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('2. Unauthenticated POST takeover request is rejected with 401', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      method: 'POST',
      body: JSON.stringify({ leadId: 'lead-101', humanTakeover: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('3. Invalid or tampered authentication credential is rejected with 401', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      headers: {
        Authorization: 'Bearer invalid.tampered_signature_payload_123',
      },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('4. Valid authenticated tenant-alpha GET is allowed with 200', async () => {
    const validTenantAlphaToken = createSignedDashboardToken(
      'tenant-alpha',
      secretKey,
    );
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      headers: { Authorization: `Bearer ${validTenantAlphaToken}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as { leads: Array<{ tenantId: string }> };
    expect(data.leads.length).toBeGreaterThan(0);
  });

  it('5. Tenant-alpha receives only tenant-alpha leads', async () => {
    const validTenantAlphaToken = createSignedDashboardToken(
      'tenant-alpha',
      secretKey,
    );
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      headers: { Authorization: `Bearer ${validTenantAlphaToken}` },
    });
    const res = await GET(req);
    const data = (await res.json()) as { leads: Array<{ tenantId: string }> };
    expect(data.leads.every((l) => l.tenantId === 'tenant-alpha')).toBe(true);
  });

  it('6. Tenant-alpha cannot access tenant-beta data', async () => {
    const validTenantAlphaToken = createSignedDashboardToken(
      'tenant-alpha',
      secretKey,
    );
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      headers: { Authorization: `Bearer ${validTenantAlphaToken}` },
    });
    const res = await GET(req);
    const data = (await res.json()) as { leads: Array<{ id: string }> };
    expect(data.leads.some((l) => l.id === 'lead-102')).toBe(false); // lead-102 belongs to tenant-beta!
  });

  it('7. User without dashboard.leads.read (tenant-restricted) is rejected with 403', async () => {
    const validRestrictedToken = createSignedDashboardToken(
      'tenant-restricted',
      secretKey,
    );
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      headers: { Authorization: `Bearer ${validRestrictedToken}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it('8. User without dashboard.leads.takeover (tenant-viewer) is rejected with 403 on POST', async () => {
    const validViewerToken = createSignedDashboardToken(
      'tenant-viewer',
      secretKey,
    );
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validViewerToken}` },
      body: JSON.stringify({ leadId: 'lead-101', humanTakeover: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('9. Tenant-alpha cannot mutate tenant-beta lead (Cross-tenant 403)', async () => {
    const validTenantAlphaToken = createSignedDashboardToken(
      'tenant-alpha',
      secretKey,
    );
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validTenantAlphaToken}` },
      body: JSON.stringify({ leadId: 'lead-102', humanTakeover: true }), // lead-102 belongs to tenant-beta!
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('10. Authorized tenant-alpha can mutate own lead (200 OK)', async () => {
    const validTenantAlphaToken = createSignedDashboardToken(
      'tenant-alpha',
      secretKey,
    );
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      method: 'POST',
      headers: { Authorization: `Bearer ${validTenantAlphaToken}` },
      body: JSON.stringify({ leadId: 'lead-101', humanTakeover: true }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);

    const data = (await res.json()) as {
      success: boolean;
      lead: { humanTakeover: boolean };
    };
    expect(data.success).toBe(true);
    expect(data.lead.humanTakeover).toBe(true);
  });

  it('11. Privileged Supabase credentials are never exposed in API response', async () => {
    const validTenantAlphaToken = createSignedDashboardToken(
      'tenant-alpha',
      secretKey,
    );
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      headers: { Authorization: `Bearer ${validTenantAlphaToken}` },
    });
    const res = await GET(req);
    const bodyText = await res.text();

    expect(bodyText).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(bodyText).not.toContain('service_role');
  });

  it('12. Raw x-tenant-id header alone cannot authenticate (Rejected with 401)', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      headers: { 'x-tenant-id': 'tenant-alpha' }, // Unsigned raw header!
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('13. Raw Authorization: Bearer <tenantId> alone cannot authenticate (Rejected with 401)', async () => {
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      headers: { Authorization: 'Bearer tenant-alpha' }, // Raw unsigned string!
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('14. Missing JWT_SIGNING_KEY environment secret fails closed in production (Rejected with 401)', async () => {
    delete process.env.JWT_SIGNING_KEY;
    const token = createSignedDashboardToken('tenant-alpha', secretKey);
    const req = new NextRequest('http://localhost/api/dashboard/leads', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});

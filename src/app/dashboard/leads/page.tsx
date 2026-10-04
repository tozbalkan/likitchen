'use client';

import React, { useState, useEffect, useCallback } from 'react';
import * as styles from './page.css';

interface QualifiedLead {
  readonly id: string;
  readonly customerName: string;
  readonly phone: string;
  readonly projectType: string;
  readonly location: string;
  readonly budget: string;
  readonly score: number;
  readonly readiness: string;
  readonly humanTakeover: boolean;
}

interface DashboardApiResponse {
  readonly leads?: readonly QualifiedLead[];
  readonly selectedTenantId?: string;
  readonly role?: string;
  readonly error?: string;
  readonly availableTenants?: readonly string[];
}

export default function LeadDashboardPage(): React.ReactElement {
  const [leads, setLeads] = useState<readonly QualifiedLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [forbiddenError, setForbiddenError] = useState<string | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('');
  const [availableTenants, setAvailableTenants] = useState<readonly string[]>(
    [],
  );

  const fetchLeadsForTenant = useCallback(
    async (tenantId: string): Promise<void> => {
      try {
        const url = `/api/dashboard/leads?tenantId=${encodeURIComponent(tenantId)}`;
        const res = await fetch(url, { credentials: 'include' });

        if (res.status === 401) {
          setAuthError(
            'Live Authentication Provider Configuration: BLOCKED BY SUPABASE PROJECT CONFIGURATION. A valid Supabase Auth session is required to access the dashboard.',
          );
          return;
        }

        const data = (await res.json()) as DashboardApiResponse;

        if (res.status === 403) {
          setForbiddenError(
            data.error ??
              'Access Denied: You do not have tenant authorization.',
          );
          return;
        }

        if (res.ok) {
          setLeads(data.leads ?? []);
          if (data.selectedTenantId) setSelectedTenant(data.selectedTenantId);
          if (data.role) setUserRole(data.role);
          if (data.availableTenants) setAvailableTenants(data.availableTenants);
        }
      } catch (e: unknown) {
        console.error('Failed to fetch leads from server:', e);
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    let ignore = false;
    async function loadInitial(): Promise<void> {
      try {
        const res = await fetch('/api/dashboard/leads', {
          credentials: 'include',
        });
        if (ignore) return;

        if (res.status === 401) {
          setAuthError(
            'Live Authentication Provider Configuration: BLOCKED BY SUPABASE PROJECT CONFIGURATION. A valid Supabase Auth session is required to access the dashboard.',
          );
          return;
        }

        const data = (await res.json()) as DashboardApiResponse;
        if (ignore) return;

        if (res.status === 403) {
          setForbiddenError(
            data.error ??
              'Access Denied: You do not have tenant authorization.',
          );
          return;
        }

        if (res.status === 400 && data.availableTenants) {
          setAvailableTenants(data.availableTenants);
          setForbiddenError(
            'Multiple tenant memberships found. Please select a tenant to view leads.',
          );
          return;
        }

        if (res.ok) {
          setLeads(data.leads ?? []);
          if (data.selectedTenantId) setSelectedTenant(data.selectedTenantId);
          if (data.role) setUserRole(data.role);
          if (data.availableTenants) setAvailableTenants(data.availableTenants);
        }
      } catch (e: unknown) {
        console.error('Failed to fetch leads from server:', e);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void loadInitial();
    return () => {
      ignore = true;
    };
  }, []);

  const handleTenantChange = (
    e: React.ChangeEvent<HTMLSelectElement>,
  ): void => {
    const newTenant = e.target.value;
    setSelectedTenant(newTenant);
    setLoading(true);
    setAuthError(null);
    setForbiddenError(null);
    void fetchLeadsForTenant(newTenant);
  };

  const toggleTakeover = async (id: string): Promise<void> => {
    const currentLead = leads.find((l) => l.id === id);
    if (!currentLead) return;

    const nextState = !currentLead.humanTakeover;

    // Optimistic UI update
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id ? { ...lead, humanTakeover: nextState } : lead,
      ),
    );

    try {
      const url = selectedTenant
        ? `/api/dashboard/leads?tenantId=${encodeURIComponent(selectedTenant)}`
        : '/api/dashboard/leads';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ leadId: id, humanTakeover: nextState }),
      });

      if (!res.ok) {
        // Revert optimistic update on failure
        setLeads((prev) =>
          prev.map((lead) =>
            lead.id === id
              ? { ...lead, humanTakeover: currentLead.humanTakeover }
              : lead,
          ),
        );
      }
    } catch (e: unknown) {
      console.error('Failed to persist human takeover on server:', e);
      // Revert optimistic update
      setLeads((prev) =>
        prev.map((lead) =>
          lead.id === id
            ? { ...lead, humanTakeover: currentLead.humanTakeover }
            : lead,
        ),
      );
    }
  };

  if (authError) {
    return (
      <div className={styles.dashboardContainer}>
        <header className={styles.dashboardHeader}>
          <h1 className={styles.dashboardTitle}>
            LI Kitchen &amp; Bed — Sales Rep Lead Dashboard
          </h1>
        </header>
        <main>
          <div
            role="alert"
            aria-live="assertive"
            className={styles.alertCardVariants.danger}
          >
            <h2 className={styles.alertTitle}>Authentication Required</h2>
            <p className={styles.alertMessage}>
              Access to this dashboard requires a verified Supabase Auth user
              session.
            </p>
            <div className={styles.alertCodeBox}>{authError}</div>
          </div>
        </main>
      </div>
    );
  }

  if (forbiddenError && leads.length === 0) {
    return (
      <div className={styles.dashboardContainer}>
        <header className={styles.dashboardHeader}>
          <h1 className={styles.dashboardTitle}>
            LI Kitchen &amp; Bed — Sales Rep Lead Dashboard
          </h1>
        </header>
        <main>
          <div
            role="alert"
            aria-live="assertive"
            className={styles.alertCardVariants.warning}
          >
            <h2 className={styles.alertTitle}>Access Restricted</h2>
            <p className={styles.alertMessage}>{forbiddenError}</p>
            {availableTenants.length > 0 && (
              <div className={styles.retrySelectContainer}>
                <label
                  htmlFor="tenant-select-retry"
                  className={styles.retrySelectLabel}
                >
                  Select Tenant:
                </label>
                <select
                  id="tenant-select-retry"
                  value={selectedTenant}
                  onChange={handleTenantChange}
                  className={styles.retrySelect}
                >
                  <option value="">-- Choose Tenant --</option>
                  {availableTenants.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className={styles.dashboardContainer}>
      <header className={styles.dashboardHeader}>
        <div className={styles.headerToolbar}>
          <div className={styles.headerTitleGroup}>
            <h1 className={styles.dashboardTitle}>
              LI Kitchen &amp; Bed — Sales Rep Lead Dashboard
            </h1>
            <p className={styles.dashboardSubtitle}>
              Active WhatsApp AI Qualified Leads &amp; Human Takeover Controls
            </p>
          </div>
          {selectedTenant && (
            <div className={styles.headerControls}>
              {availableTenants.length > 1 && (
                <div className={styles.tenantSelectWrapper}>
                  <label htmlFor="tenant-select" className={styles.tenantLabel}>
                    Tenant:
                  </label>
                  <select
                    id="tenant-select"
                    value={selectedTenant}
                    onChange={handleTenantChange}
                    className={styles.tenantSelect}
                  >
                    {availableTenants.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <span className={styles.tenantBadge}>
                Tenant: {selectedTenant}
              </span>
              {userRole && (
                <span className={styles.roleBadge}>Role: {userRole}</span>
              )}
            </div>
          )}
        </div>
      </header>

      <main>
        {loading ? (
          <p className={styles.loadingMessage} aria-live="polite">
            Loading active leads...
          </p>
        ) : (
          <div className={styles.leadsGrid}>
            {leads.map((lead) => (
              <div key={lead.id} className={styles.leadCard}>
                <div className={styles.leadCardHeader}>
                  <h2 className={styles.customerName}>{lead.customerName}</h2>
                  <span className={styles.scoreBadge}>
                    Score: {lead.score}/100
                  </span>
                </div>

                <div className={styles.leadDetails}>
                  <div>
                    <strong>Phone:</strong> {lead.phone}
                  </div>
                  <div>
                    <strong>Project:</strong> {lead.projectType}
                  </div>
                  <div>
                    <strong>Location:</strong> {lead.location}
                  </div>
                  <div>
                    <strong>Budget:</strong> {lead.budget}
                  </div>
                  <div>
                    <strong>Status:</strong>{' '}
                    <span
                      className={
                        lead.readiness === 'READY_FOR_HANDOFF'
                          ? styles.statusReady
                          : styles.statusUnresolved
                      }
                    >
                      {lead.readiness}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void toggleTakeover(lead.id)}
                  className={
                    styles.btnTakeoverVariants[
                      lead.humanTakeover ? 'human' : 'bot'
                    ]
                  }
                >
                  {lead.humanTakeover
                    ? 'Release Control to AI Bot'
                    : 'Takeover Conversation (Human)'}
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

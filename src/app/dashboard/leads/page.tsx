'use client';

import React, { useState, useEffect } from 'react';

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

/**
 * PRODUCTION BLOCKER: Dashboard authentication is not implemented.
 *
 * This page requires a production-capable web session/authentication mechanism
 * (e.g., NextAuth.js, Supabase Auth, or equivalent) to securely identify the
 * authenticated user and their tenant membership before issuing API requests.
 *
 * Until a real authentication architecture is implemented:
 * - No hardcoded tokens or static secrets may be placed in client bundles.
 * - The dashboard API will correctly reject all unauthenticated requests with 401.
 * - This page renders the UI skeleton with an explicit authentication-required message.
 */

export default function LeadDashboardPage(): React.ReactElement {
  const [leads, setLeads] = useState<readonly QualifiedLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<boolean>(false);

  useEffect(() => {
    async function fetchLeads(): Promise<void> {
      try {
        // BLOCKED: No authentication token source available.
        // When a production session mechanism is implemented, the token
        // should be retrieved from an HttpOnly cookie or server-side session.
        const res = await fetch('/api/dashboard/leads', {
          credentials: 'include', // Will use session cookie when auth is implemented
        });

        if (res.status === 401) {
          setAuthError(true);
          return;
        }

        if (res.ok) {
          const data = (await res.json()) as { leads: QualifiedLead[] };
          setLeads(data.leads ?? []);
        }
      } catch (e: unknown) {
        console.error('Failed to fetch leads from server:', e);
      } finally {
        setLoading(false);
      }
    }
    void fetchLeads();
  }, []);

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
      await fetch('/api/dashboard/leads', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Will use session cookie when auth is implemented
        body: JSON.stringify({ leadId: id, humanTakeover: nextState }),
      });
    } catch (e: unknown) {
      console.error('Failed to persist human takeover on server:', e);
    }
  };

  if (authError) {
    return (
      <div className="dashboard-container">
        <header className="dashboard-header">
          <h1 className="dashboard-title">
            LI Kitchen &amp; Bed — Sales Rep Lead Dashboard
          </h1>
        </header>
        <main>
          <div
            style={{
              padding: '2rem',
              margin: '2rem auto',
              maxWidth: '600px',
              border: '1px solid hsl(0, 60%, 50%)',
              borderRadius: '8px',
              backgroundColor: 'hsl(0, 60%, 97%)',
              color: 'hsl(0, 60%, 30%)',
              textAlign: 'center',
            }}
          >
            <h2 style={{ marginBottom: '1rem' }}>Authentication Required</h2>
            <p>
              Dashboard access requires a production authentication mechanism
              that has not been implemented yet. Contact the development team to
              configure user authentication.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">
          LI Kitchen &amp; Bed — Sales Rep Lead Dashboard
        </h1>
        <p className="dashboard-subtitle">
          Active WhatsApp AI Qualified Leads &amp; Human Takeover Controls
        </p>
      </header>

      <main>
        {loading ? (
          <p style={{ color: 'hsl(215, 20%, 65%)' }}>Loading active leads...</p>
        ) : (
          <div className="leads-grid">
            {leads.map((lead) => (
              <div key={lead.id} className="lead-card">
                <div className="lead-card-header">
                  <h2 className="customer-name">{lead.customerName}</h2>
                  <span className="score-badge">Score: {lead.score}/100</span>
                </div>

                <div className="lead-details">
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
                          ? 'status-ready'
                          : 'status-unresolved'
                      }
                    >
                      {lead.readiness}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void toggleTakeover(lead.id)}
                  className={`btn-takeover ${lead.humanTakeover ? 'human' : 'bot'}`}
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

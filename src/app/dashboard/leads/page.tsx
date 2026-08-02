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

export default function LeadDashboardPage(): React.ReactElement {
  const [leads, setLeads] = useState<readonly QualifiedLead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function fetchLeads(): Promise<void> {
      try {
        const res = await fetch('/api/dashboard/leads');
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: id, humanTakeover: nextState }),
      });
    } catch (e: unknown) {
      console.error('Failed to persist human takeover on server:', e);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1 className="dashboard-title">
          LI Kitchen & Bed — Sales Rep Lead Dashboard
        </h1>
        <p className="dashboard-subtitle">
          Active WhatsApp AI Qualified Leads & Human Takeover Controls
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

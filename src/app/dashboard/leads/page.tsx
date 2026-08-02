'use client';

import React, { useState } from 'react';

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

const INITIAL_LEADS: readonly QualifiedLead[] = [
  {
    id: 'lead-101',
    customerName: 'Sarah Jenkins',
    phone: '+1 (555) 234-5678',
    projectType: 'Full Kitchen Remodel',
    location: 'Nassau County, NY',
    budget: '$40,000 – $60,000',
    score: 88,
    readiness: 'READY_FOR_HANDOFF',
    humanTakeover: false,
  },
  {
    id: 'lead-102',
    customerName: 'Michael Chang',
    phone: '+1 (555) 876-5432',
    projectType: 'Master Bathroom Remodel',
    location: 'Brooklyn, NY',
    budget: '$25,000 – $35,000',
    score: 92,
    readiness: 'READY_FOR_HANDOFF',
    humanTakeover: true,
  },
];

export default function LeadDashboardPage(): React.ReactElement {
  const [leads, setLeads] = useState<readonly QualifiedLead[]>(INITIAL_LEADS);

  const toggleTakeover = (id: string): void => {
    setLeads((prev) =>
      prev.map((lead) =>
        lead.id === id ? { ...lead, humanTakeover: !lead.humanTakeover } : lead,
      ),
    );
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
                onClick={() => toggleTakeover(lead.id)}
                className={`btn-takeover ${lead.humanTakeover ? 'human' : 'bot'}`}
              >
                {lead.humanTakeover
                  ? 'Release Control to AI Bot'
                  : 'Takeover Conversation (Human)'}
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

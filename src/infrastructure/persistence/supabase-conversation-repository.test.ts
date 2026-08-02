import { describe, it, expect } from 'vitest';
import { SupabaseConversationRepository } from './supabase-conversation-repository';

describe('Milestone 030.4: Supabase Conversation & Lead Persistence', () => {
  it('1. Saves and retrieves conversation state and leads', async () => {
    const repo = new SupabaseConversationRepository();

    await repo.saveConversation({
      id: 'conv-100',
      phoneNumber: '+15551234567',
      stage: 'budget',
      revision: 1,
      facts: { location: 'Nassau County', budget_range: '30k_60k' },
      score: 85,
      readinessStatus: 'ready',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const savedConv = await repo.getConversation('conv-100');
    expect(savedConv).not.toBeNull();
    expect(savedConv?.phoneNumber).toBe('+15551234567');
    expect(savedConv?.score).toBe(85);

    await repo.saveLead({
      id: 'lead-1',
      conversationId: 'conv-100',
      phone: '+15551234567',
      projectType: 'full_kitchen_remodel',
      location: 'Nassau County',
      budget: '30k_60k',
      timeline: '3_6_months',
      status: 'NEW',
      createdAt: new Date().toISOString(),
    });

    const leads = await repo.listLeads();
    expect(leads).toHaveLength(1);
    expect(leads[0]?.location).toBe('Nassau County');
  });
});

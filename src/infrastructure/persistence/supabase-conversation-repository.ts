export interface ConversationRecord {
  readonly id: string;
  readonly phoneNumber: string;
  readonly stage: string;
  readonly revision: number;
  readonly facts: Record<string, unknown>;
  readonly score: number;
  readonly readinessStatus: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface LeadRecord {
  readonly id: string;
  readonly conversationId: string;
  readonly customerName?: string;
  readonly phone: string;
  readonly projectType?: string;
  readonly location?: string;
  readonly budget?: string;
  readonly timeline?: string;
  readonly status: 'NEW' | 'ASSIGNED' | 'CONTACTED' | 'CLOSED';
  readonly assignedTo?: string;
  readonly createdAt: string;
}

export class SupabaseConversationRepository {
  private readonly conversations = new Map<string, ConversationRecord>();
  private readonly leads = new Map<string, LeadRecord>();

  async saveConversation(record: ConversationRecord): Promise<void> {
    this.conversations.set(record.id, record);
  }

  async getConversation(id: string): Promise<ConversationRecord | null> {
    return this.conversations.get(id) ?? null;
  }

  async saveLead(lead: LeadRecord): Promise<void> {
    this.leads.set(lead.id, lead);
  }

  async listLeads(): Promise<readonly LeadRecord[]> {
    return Array.from(this.leads.values());
  }
}

import type { TenantContext } from '../../identity/tenant-context';

export interface ConversationMemoryEntry {
  readonly role: 'user' | 'assistant' | 'system';
  readonly content: string;
  readonly timestamp: Date;
}

export interface ConversationMemoryPort {
  getHistory(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
    limit?: number,
  ): Promise<readonly ConversationMemoryEntry[]>;

  appendMessage(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
    entry: Readonly<ConversationMemoryEntry>,
  ): Promise<void>;
}

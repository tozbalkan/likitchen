import type {
  ConversationMemoryPort,
  ConversationMemoryEntry,
} from '../../../application/agent/ports/conversation-memory-port';
import type {
  SemanticMemoryPort,
  SemanticMemoryEntry,
} from '../../../application/agent/ports/semantic-memory-port';
import type { WorkingMemoryPort } from '../../../application/agent/ports/working-memory-port';
import type { TenantContext } from '../../../application/identity/tenant-context';

export class InMemoryAgentMemoryAdapter
  implements ConversationMemoryPort, SemanticMemoryPort, WorkingMemoryPort
{
  private readonly conversationStore = new Map<
    string,
    ConversationMemoryEntry[]
  >();
  private readonly semanticStore = new Map<string, SemanticMemoryEntry[]>();
  private readonly workingStore = new Map<string, Map<string, unknown>>();

  private makeTenantKey(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
  ): string {
    return `${tenantContext.tenantId}:${sessionId}`;
  }

  // ConversationMemoryPort
  async getHistory(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
    limit = 10,
  ): Promise<readonly ConversationMemoryEntry[]> {
    const key = this.makeTenantKey(tenantContext, sessionId);
    const history = this.conversationStore.get(key) ?? [];
    return history.slice(-limit);
  }

  async appendMessage(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
    entry: Readonly<ConversationMemoryEntry>,
  ): Promise<void> {
    const key = this.makeTenantKey(tenantContext, sessionId);
    const history = this.conversationStore.get(key) ?? [];
    history.push(entry);
    this.conversationStore.set(key, history);
  }

  // SemanticMemoryPort
  async search(
    tenantContext: Readonly<TenantContext>,
    query: string,
    limit = 3,
  ): Promise<readonly SemanticMemoryEntry[]> {
    const entries = this.semanticStore.get(tenantContext.tenantId) ?? [];
    const lowerQuery = query.toLowerCase();
    const matches = entries.filter((e) =>
      e.content.toLowerCase().includes(lowerQuery),
    );
    return matches.slice(0, limit);
  }

  async store(
    tenantContext: Readonly<TenantContext>,
    entry: Readonly<SemanticMemoryEntry>,
  ): Promise<void> {
    const entries = this.semanticStore.get(tenantContext.tenantId) ?? [];
    entries.push(entry);
    this.semanticStore.set(tenantContext.tenantId, entries);
  }

  // WorkingMemoryPort
  async get(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
    key: string,
  ): Promise<unknown | undefined> {
    const tenantKey = this.makeTenantKey(tenantContext, sessionId);
    const sessionMap = this.workingStore.get(tenantKey);
    return sessionMap?.get(key);
  }

  async set(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
    key: string,
    value: unknown,
  ): Promise<void> {
    const tenantKey = this.makeTenantKey(tenantContext, sessionId);
    let sessionMap = this.workingStore.get(tenantKey);
    if (!sessionMap) {
      sessionMap = new Map<string, unknown>();
      this.workingStore.set(tenantKey, sessionMap);
    }
    sessionMap.set(key, value);
  }

  async clear(
    tenantContext: Readonly<TenantContext>,
    sessionId: string,
  ): Promise<void> {
    const tenantKey = this.makeTenantKey(tenantContext, sessionId);
    this.workingStore.delete(tenantKey);
  }
}

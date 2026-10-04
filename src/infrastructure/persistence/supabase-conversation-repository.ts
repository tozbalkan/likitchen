import type { ConversationStore } from '../../application/conversation/ports/conversation-store';
import type { IdempotencyStore } from '../../application/conversation/ports/idempotency-store';
import type { ConversationUnitOfWork } from '../../application/conversation/ports/conversation-uow';
import { Conversation } from '../../domain/conversation/entities/conversation';
import type { Stage } from '../../domain/conversation/state-machine';
import type { ConversationFacts } from '../../domain/conversation/conversation-facts';
import { calculateReadiness } from '../../domain/conversation/scoring';
import type { Uuid, ProcessContext } from '../../shared/types';
import { ok, err, type Result } from '../../shared/result';
import { NotFoundError } from '../../shared/errors/not-found';
import { ConflictFailure } from '../../shared/errors/conflict';

export interface ConversationRecord {
  readonly id: string;
  readonly tenantId?: string | undefined;
  readonly phoneNumber: string;
  readonly stage: string;
  readonly revision: number;
  readonly facts: Record<string, unknown>;
  readonly score: number;
  readonly readinessStatus: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface MessageRecord {
  readonly id: string;
  readonly tenantId?: string | undefined;
  readonly conversationId: string;
  readonly direction: 'inbound' | 'outbound';
  readonly providerMessageId: string;
  readonly content: string;
  readonly createdAt: string;
  readonly processedAt?: string | undefined;
}

export interface LeadRecord {
  readonly id: string;
  readonly tenantId?: string | undefined;
  readonly conversationId: string;
  readonly customerName?: string | undefined;
  readonly phone: string;
  readonly projectType?: string | undefined;
  readonly location?: string | undefined;
  readonly budget?: string | undefined;
  readonly timeline?: string | undefined;
  readonly status: 'NEW' | 'ASSIGNED' | 'CONTACTED' | 'CLOSED';
  readonly assignedTo?: string | undefined;
  readonly humanTakeover: boolean;
  readonly createdAt: string;
}

/**
 * Outcome of recording an inbound provider message.
 * - `new`: first delivery, must be processed.
 * - `retry`: delivered before but never finished processing (e.g. a pipeline failure), must be processed again.
 * - `already_processed`: duplicate delivery of a processed message, must be skipped.
 */
export type InboundMessageStatus = 'new' | 'retry' | 'already_processed';

/** Score at or above which a conversation is considered ready for human handoff. */
export const READY_FOR_HANDOFF_SCORE = 70;

const REQUEST_TIMEOUT_MS = 10_000;

/**
 * Thrown for infrastructure failures (network, timeout, unexpected HTTP status).
 * Never mapped to NotFound: callers must not mistake an outage for an empty result.
 */
export class SupabaseRequestError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = 'SupabaseRequestError';
  }
}

/**
 * Production Supabase Conversation & Lead Repository, scoped to a single tenant.
 *
 * FAIL-CLOSED PRODUCTION PERSISTENCE:
 * Connects to PostgreSQL via Supabase PostgREST using the service-role key, which bypasses RLS.
 * Tenant isolation is therefore enforced here: every query and mutation is filtered by `tenantId`.
 * Construction fails if SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY or the tenant id is missing.
 * Infrastructure errors are thrown, never silently converted to "not found" or empty results.
 */
export class SupabaseConversationRepository
  implements ConversationStore, IdempotencyStore
{
  private readonly supabaseUrl: string;
  private readonly serviceRoleKey: string;
  public readonly tenantId: string;

  constructor(props?: {
    supabaseUrl?: string;
    serviceRoleKey?: string;
    tenantId?: string;
  }) {
    const url = props?.supabaseUrl ?? process.env.SUPABASE_URL;
    const key = props?.serviceRoleKey ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
    const tenantId = props?.tenantId ?? process.env.WHATSAPP_TENANT_ID;

    if (!url || url.trim() === '' || !key || key.trim() === '') {
      throw new Error(
        '[SupabaseConversationRepository] Missing mandatory SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY configuration. Production persistence cannot operate without valid Supabase credentials.',
      );
    }
    if (!tenantId || tenantId.trim() === '') {
      throw new Error(
        '[SupabaseConversationRepository] Missing mandatory tenant id (WHATSAPP_TENANT_ID). Persistence refuses to write unscoped data.',
      );
    }

    this.supabaseUrl = url.trim().replace(/\/+$/, '');
    this.serviceRoleKey = key.trim();
    this.tenantId = tenantId.trim();
  }

  private async request(
    path: string,
    init: { method?: string; prefer?: string; body?: unknown } = {},
  ): Promise<Response> {
    const headers: Record<string, string> = {
      apikey: this.serviceRoleKey,
      Authorization: `Bearer ${this.serviceRoleKey}`,
      'Content-Type': 'application/json',
    };
    if (init.prefer) headers.Prefer = init.prefer;

    try {
      return await fetch(`${this.supabaseUrl}/rest/v1/${path}`, {
        method: init.method ?? 'GET',
        headers,
        ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (e: unknown) {
      throw new SupabaseRequestError(
        `Supabase request failed (${init.method ?? 'GET'} ${path.split('?')[0]}): ${e instanceof Error ? e.message : 'network error'}`,
      );
    }
  }

  private async expectOk(res: Response, operation: string): Promise<void> {
    if (res.ok) return;
    const detail = await res.text().catch(() => '');
    throw new SupabaseRequestError(
      `Supabase ${operation} failed with HTTP ${res.status}: ${detail.slice(0, 300)}`,
      res.status,
    );
  }

  private async selectRows(
    path: string,
    operation: string,
  ): Promise<Array<Record<string, unknown>>> {
    const res = await this.request(path);
    await this.expectOk(res, operation);
    return (await res.json()) as Array<Record<string, unknown>>;
  }

  private tenantFilter(): string {
    return `tenant_id=eq.${encodeURIComponent(this.tenantId)}`;
  }

  /**
   * Creates the conversation row (and its lead row) if they do not exist yet.
   * Must run before any message is recorded: messages.conversation_id is a foreign key.
   * Idempotent: existing rows are left untouched.
   */
  async ensureConversation(
    conversationId: string,
    phoneNumber: string,
  ): Promise<void> {
    const initial = Conversation.start(conversationId as Uuid);

    const convRes = await this.request('conversations?on_conflict=id', {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: {
        id: conversationId,
        tenant_id: this.tenantId,
        phone_number: phoneNumber,
        stage: initial.state.stage,
        revision: initial.revision,
        facts: initial.facts,
        score: 0,
        readiness_status: 'unresolved',
      },
    });
    await this.expectOk(convRes, 'conversation create');

    const leadRes = await this.request('leads?on_conflict=id', {
      method: 'POST',
      prefer: 'resolution=ignore-duplicates,return=minimal',
      body: {
        id: `lead-${conversationId}`,
        tenant_id: this.tenantId,
        conversation_id: conversationId,
        phone: phoneNumber,
        status: 'NEW',
      },
    });
    await this.expectOk(leadRes, 'lead create');
  }

  // ConversationStore Implementation
  async findById(id: Uuid): Promise<Result<Conversation, NotFoundError>> {
    const rows = await this.selectRows(
      `conversations?id=eq.${encodeURIComponent(id)}&${this.tenantFilter()}&select=*`,
      'conversation lookup',
    );
    const row = rows[0];
    if (!row) {
      return err(new NotFoundError(`Conversation ${id} not found.`));
    }
    return ok(
      Conversation.rehydrate(
        row.id as Uuid,
        {
          conversation_id: row.id as Uuid,
          stage: (row.stage as Stage) ?? 'greeting',
          followup_count: 0,
          status: 'open',
        },
        (row.facts as unknown as ConversationFacts) ?? {},
        (row.revision as number) ?? 0,
      ),
    );
  }

  /**
   * Persists the aggregate with an optimistic lock on the stored revision.
   * The row is only updated while its stored revision is lower than the aggregate's,
   * so of two concurrent writers that loaded the same revision, the second gets a ConflictFailure.
   * The row must already exist (see ensureConversation).
   */
  async save(
    conversation: Conversation,
    _expectedRevision: number,
  ): Promise<Result<void, ConflictFailure>> {
    const score = calculateReadiness(conversation.facts) ?? 0;

    const convRes = await this.request(
      `conversations?id=eq.${encodeURIComponent(conversation.id)}&${this.tenantFilter()}&revision=lt.${conversation.revision}`,
      {
        method: 'PATCH',
        prefer: 'return=representation',
        body: {
          stage: conversation.state.stage,
          revision: conversation.revision,
          facts: conversation.facts,
          score,
          readiness_status:
            score >= READY_FOR_HANDOFF_SCORE ? 'ready' : 'unresolved',
          updated_at: new Date().toISOString(),
        },
      },
    );
    await this.expectOk(convRes, 'conversation update');
    const updated = (await convRes.json()) as unknown[];
    if (updated.length === 0) {
      return err(
        new ConflictFailure(
          `Conversation ${conversation.id} was modified concurrently or does not exist (revision ${conversation.revision}).`,
        ),
      );
    }

    // Only fact-derived columns: status, assignment and human takeover belong to the dashboard.
    const leadRes = await this.request(
      `leads?conversation_id=eq.${encodeURIComponent(conversation.id)}&${this.tenantFilter()}`,
      {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: {
          project_type: conversation.facts.project_type ?? null,
          location: conversation.facts.location_raw ?? null,
          budget: conversation.facts.budget_range ?? null,
          timeline: conversation.facts.timeline ?? null,
        },
      },
    );
    await this.expectOk(leadRes, 'lead update');

    return ok(undefined);
  }

  async getConversationRecord(id: string): Promise<ConversationRecord | null> {
    const rows = await this.selectRows(
      `conversations?id=eq.${encodeURIComponent(id)}&${this.tenantFilter()}&select=*`,
      'conversation record lookup',
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: String(r.id),
      tenantId: r.tenant_id ? String(r.tenant_id) : undefined,
      phoneNumber: String(r.phone_number ?? ''),
      stage: String(r.stage ?? ''),
      revision: Number(r.revision ?? 0),
      facts: (r.facts as Record<string, unknown>) ?? {},
      score: Number(r.score ?? 0),
      readinessStatus: String(r.readiness_status ?? ''),
      createdAt: String(r.created_at ?? ''),
      updatedAt: String(r.updated_at ?? ''),
    };
  }

  // Message Persistence

  /**
   * Atomically records an inbound message on UNIQUE(provider_message_id).
   * Distinguishes a true duplicate from a previously failed delivery that must be retried.
   * The conversation row must exist first (see ensureConversation).
   */
  async recordInboundMessage(msg: {
    readonly conversationId: string;
    readonly providerMessageId: string;
    readonly content: string;
  }): Promise<InboundMessageStatus> {
    const res = await this.request('messages', {
      method: 'POST',
      prefer: 'return=minimal',
      body: {
        id: crypto.randomUUID(),
        tenant_id: this.tenantId,
        conversation_id: msg.conversationId,
        direction: 'inbound',
        provider_message_id: msg.providerMessageId,
        content: msg.content,
      },
    });

    if (res.ok) return 'new';

    if (res.status === 409) {
      const existing = await this.getMessageByProviderId(msg.providerMessageId);
      if (!existing) {
        // 409 without a matching row is not a duplicate (e.g. foreign key violation).
        throw new SupabaseRequestError(
          `Supabase message insert conflicted without a matching provider message (HTTP 409): ${(await res.text().catch(() => '')).slice(0, 300)}`,
          409,
        );
      }
      return existing.processedAt ? 'already_processed' : 'retry';
    }

    await this.expectOk(res, 'message insert');
    return 'new';
  }

  async markMessageProcessed(providerMessageId: string): Promise<void> {
    const res = await this.request(
      `messages?provider_message_id=eq.${encodeURIComponent(providerMessageId)}&${this.tenantFilter()}`,
      {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: { processed_at: new Date().toISOString() },
      },
    );
    await this.expectOk(res, 'message mark processed');
  }

  async getMessageByProviderId(
    providerMessageId: string,
  ): Promise<MessageRecord | null> {
    const rows = await this.selectRows(
      `messages?provider_message_id=eq.${encodeURIComponent(providerMessageId)}&${this.tenantFilter()}&select=*`,
      'message lookup',
    );
    const r = rows[0];
    if (!r) return null;
    return {
      id: String(r.id),
      tenantId: r.tenant_id ? String(r.tenant_id) : undefined,
      conversationId: String(r.conversation_id),
      direction: r.direction as 'inbound' | 'outbound',
      providerMessageId: String(r.provider_message_id),
      content: String(r.content),
      createdAt: String(r.created_at),
      processedAt: r.processed_at ? String(r.processed_at) : undefined,
    };
  }

  // IdempotencyStore Implementation
  async isProcessed(idempotencyKey: string): Promise<boolean> {
    const msg = await this.getMessageByProviderId(idempotencyKey);
    return Boolean(msg?.processedAt);
  }

  async markProcessed(idempotencyKey: string): Promise<void> {
    await this.markMessageProcessed(idempotencyKey);
  }

  // Lead queries (always scoped to this repository's tenant)
  async listLeads(): Promise<readonly LeadRecord[]> {
    const rows = await this.selectRows(
      `leads?${this.tenantFilter()}&select=*&order=created_at.desc`,
      'lead list',
    );
    return rows.map(toLeadRecord);
  }

  async getLead(id: string): Promise<LeadRecord | null> {
    const rows = await this.selectRows(
      `leads?id=eq.${encodeURIComponent(id)}&${this.tenantFilter()}&select=*`,
      'lead lookup',
    );
    return rows[0] ? toLeadRecord(rows[0]) : null;
  }
}

function toLeadRecord(r: Record<string, unknown>): LeadRecord {
  return {
    id: String(r.id),
    tenantId: r.tenant_id ? String(r.tenant_id) : undefined,
    conversationId: String(r.conversation_id),
    customerName: r.customer_name ? String(r.customer_name) : undefined,
    phone: String(r.phone),
    projectType: r.project_type ? String(r.project_type) : undefined,
    location: r.location ? String(r.location) : undefined,
    budget: r.budget ? String(r.budget) : undefined,
    timeline: r.timeline ? String(r.timeline) : undefined,
    status: (r.status as LeadRecord['status']) ?? 'NEW',
    assignedTo: r.assigned_to ? String(r.assigned_to) : undefined,
    humanTakeover: r.human_takeover === true,
    createdAt: String(r.created_at),
  };
}

export class SupabaseConversationUnitOfWork implements ConversationUnitOfWork {
  constructor(private readonly repository: SupabaseConversationRepository) {}

  async execute<T>(
    _context: Readonly<ProcessContext>,
    action: (stores: {
      conversation: ConversationStore;
      idempotency: IdempotencyStore;
    }) => Promise<T>,
  ): Promise<T> {
    return action({
      conversation: this.repository,
      idempotency: this.repository,
    });
  }
}

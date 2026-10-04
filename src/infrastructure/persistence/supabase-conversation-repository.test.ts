import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SupabaseConversationRepository } from './supabase-conversation-repository';
import { Conversation } from '../../domain/conversation/entities/conversation';
import type { Uuid } from '../../shared/types';
import { MemoryConversationRepository } from './memory-conversation-repository';

describe('R4: Persistence Fail-Closed & Test Repository Contracts', () => {
  describe('SupabaseConversationRepository (Fail-Closed Production Guard)', () => {
    it('1. Fails closed and throws when SUPABASE_URL is missing', () => {
      expect(() => {
        new SupabaseConversationRepository({
          supabaseUrl: '',
          serviceRoleKey: 'valid-service-role-key',
        });
      }).toThrow(
        '[SupabaseConversationRepository] Missing mandatory SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY configuration.',
      );
    });

    it('2. Fails closed and throws when SUPABASE_SERVICE_ROLE_KEY is missing', () => {
      expect(() => {
        new SupabaseConversationRepository({
          supabaseUrl: 'https://test-project.supabase.co',
          serviceRoleKey: '',
        });
      }).toThrow(
        '[SupabaseConversationRepository] Missing mandatory SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY configuration.',
      );
    });

    it('3. Fails closed when both environment variables and constructor props are missing', () => {
      const originalUrl = process.env.SUPABASE_URL;
      const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      try {
        expect(() => {
          new SupabaseConversationRepository();
        }).toThrow(
          '[SupabaseConversationRepository] Missing mandatory SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY configuration.',
        );
      } finally {
        if (originalUrl) process.env.SUPABASE_URL = originalUrl;
        if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
      }
    });

    it('3b. Fails closed when the tenant id is missing', () => {
      const originalTenant = process.env.WHATSAPP_TENANT_ID;
      delete process.env.WHATSAPP_TENANT_ID;
      try {
        expect(() => {
          new SupabaseConversationRepository({
            supabaseUrl: 'https://test-project.supabase.co',
            serviceRoleKey: 'valid-service-role-key',
          });
        }).toThrow('Missing mandatory tenant id');
      } finally {
        if (originalTenant) process.env.WHATSAPP_TENANT_ID = originalTenant;
      }
    });

    describe('REST behaviour', () => {
      interface FetchCall {
        readonly url: string;
        readonly method: string;
        readonly prefer: string | undefined;
        readonly body: Record<string, unknown> | undefined;
      }

      let calls: FetchCall[];
      let responder: (call: FetchCall) => Response | Promise<Response>;
      const originalFetch = globalThis.fetch;

      const repo = (): SupabaseConversationRepository =>
        new SupabaseConversationRepository({
          supabaseUrl: 'https://test-supabase-project.supabase.co/',
          serviceRoleKey: 'test-service-role-key',
          tenantId: 'tenant-test',
        });

      const json = (data: unknown, status = 200): Response =>
        new Response(JSON.stringify(data), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });

      beforeEach(() => {
        calls = [];
        responder = () => new Response(null, { status: 201 });
        globalThis.fetch = async (
          input: RequestInfo | URL,
          init?: RequestInit,
        ): Promise<Response> => {
          const headers = (init?.headers ?? {}) as Record<string, string>;
          const call: FetchCall = {
            url: String(input),
            method: init?.method ?? 'GET',
            prefer: headers.Prefer,
            body: init?.body
              ? (JSON.parse(String(init.body)) as Record<string, unknown>)
              : undefined,
          };
          calls.push(call);
          return responder(call);
        };
      });

      afterEach(() => {
        globalThis.fetch = originalFetch;
      });

      it('4. ensureConversation creates the conversation before the lead, idempotently and tenant-scoped', async () => {
        await repo().ensureConversation('conv-1', '15551234567');

        expect(calls.map((c) => c.url)).toEqual([
          'https://test-supabase-project.supabase.co/rest/v1/conversations?on_conflict=id',
          'https://test-supabase-project.supabase.co/rest/v1/leads?on_conflict=id',
        ]);
        expect(
          calls.every((c) => c.prefer?.includes('ignore-duplicates')),
        ).toBe(true);
        expect(calls[0]?.body).toMatchObject({
          id: 'conv-1',
          tenant_id: 'tenant-test',
          phone_number: '15551234567',
          revision: 0,
        });
        expect(calls[1]?.body).toMatchObject({
          conversation_id: 'conv-1',
          tenant_id: 'tenant-test',
          phone: '15551234567',
        });
      });

      it('5. recordInboundMessage returns new on insert and uses a random UUID id', async () => {
        const status = await repo().recordInboundMessage({
          conversationId: 'conv-1',
          providerMessageId: 'wamid.1',
          content: 'hello',
        });
        expect(status).toBe('new');
        expect(calls[0]?.body?.id).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
        );
        expect(calls[0]?.body?.tenant_id).toBe('tenant-test');
      });

      it('6. recordInboundMessage distinguishes processed duplicates from retries on 409', async () => {
        let processedAt: string | null = '2026-10-04T10:00:00Z';
        responder = (call) =>
          call.method === 'POST'
            ? json({ code: '23505' }, 409)
            : json([
                {
                  id: 'm1',
                  conversation_id: 'conv-1',
                  direction: 'inbound',
                  provider_message_id: 'wamid.1',
                  content: 'hello',
                  created_at: '2026-10-04T10:00:00Z',
                  processed_at: processedAt,
                },
              ]);

        const msg = {
          conversationId: 'conv-1',
          providerMessageId: 'wamid.1',
          content: 'hello',
        };
        expect(await repo().recordInboundMessage(msg)).toBe(
          'already_processed',
        );

        processedAt = null;
        expect(await repo().recordInboundMessage(msg)).toBe('retry');
      });

      it('7. recordInboundMessage throws on 409 without a matching message (e.g. foreign key violation)', async () => {
        responder = (call) =>
          call.method === 'POST' ? json({ code: '23503' }, 409) : json([]);

        await expect(
          repo().recordInboundMessage({
            conversationId: 'conv-missing',
            providerMessageId: 'wamid.2',
            content: 'hello',
          }),
        ).rejects.toThrow('HTTP 409');
      });

      it('8. findById throws on infrastructure failure instead of reporting NOT_FOUND', async () => {
        responder = () => {
          throw new Error('Supabase cluster unreachable');
        };
        await expect(repo().findById('conv-1' as Uuid)).rejects.toThrow(
          'Supabase cluster unreachable',
        );

        responder = () => json({ message: 'boom' }, 503);
        await expect(repo().findById('conv-1' as Uuid)).rejects.toThrow(
          'HTTP 503',
        );
      });

      it('9. findById reports NOT_FOUND only for an empty tenant-scoped result', async () => {
        responder = () => json([]);
        const res = await repo().findById('conv-1' as Uuid);
        expect(res.ok).toBe(false);
        if (!res.ok) expect(res.error.code).toBe('NOT_FOUND');
        expect(calls[0]?.url).toContain('tenant_id=eq.tenant-test');
      });

      it('10. save applies an optimistic revision lock and reports a conflict when no row matches', async () => {
        const conversation = Conversation.start('conv-1' as Uuid);
        conversation.continue(
          1,
          'evt-1' as Uuid,
          new Date().toISOString() as never,
        );

        responder = () => json([]);
        const conflict = await repo().save(conversation, 0);
        expect(conflict.ok).toBe(false);
        if (!conflict.ok) expect(conflict.error.code).toBe('CONFLICT_FAILURE');
        expect(calls[0]?.method).toBe('PATCH');
        expect(calls[0]?.url).toContain(`revision=lt.${conversation.revision}`);
        expect(calls[0]?.url).toContain('tenant_id=eq.tenant-test');
      });

      it('11. save updates only fact-derived lead columns, never status or takeover', async () => {
        const conversation = Conversation.start('conv-1' as Uuid);
        conversation.continue(
          1,
          'evt-1' as Uuid,
          new Date().toISOString() as never,
        );

        responder = (call) =>
          call.url.includes('/conversations')
            ? json([{ id: 'conv-1' }])
            : new Response(null, { status: 204 });
        const res = await repo().save(conversation, 0);

        expect(res.ok).toBe(true);
        const leadPatch = calls.find((c) => c.url.includes('/leads'));
        expect(leadPatch?.method).toBe('PATCH');
        expect(leadPatch?.body).not.toHaveProperty('status');
        expect(leadPatch?.body).not.toHaveProperty('human_takeover');
        expect(leadPatch?.body).not.toHaveProperty('phone');
        expect(calls[0]?.body).not.toHaveProperty('phone_number');
      });

      it('12. listLeads is always filtered by the repository tenant', async () => {
        responder = () =>
          json([
            {
              id: 'lead-1',
              tenant_id: 'tenant-test',
              conversation_id: 'conv-1',
              phone: '+15551234567',
              status: 'NEW',
              human_takeover: true,
              created_at: new Date().toISOString(),
            },
          ]);
        const leads = await repo().listLeads();
        expect(leads[0]?.humanTakeover).toBe(true);
        expect(calls[0]?.url).toContain('tenant_id=eq.tenant-test');
      });

      it('13. Proves no persistence call silently uses Map/Set in production (No fallback state)', () => {
        const repoAny = repo() as unknown as Record<string, unknown>;
        expect(repoAny.conversationsMap).toBeUndefined();
        expect(repoAny.messagesMap).toBeUndefined();
        expect(repoAny.leadsMap).toBeUndefined();
        expect(repoAny.processedMessageIds).toBeUndefined();
      });
    });
  });

  describe('MemoryConversationRepository (Explicit Test-Only Double)', () => {
    it('6. Explicit test double saves and retrieves messages', async () => {
      const repo = new MemoryConversationRepository();

      const saved = await repo.saveMessage({
        id: 'msg-1',
        conversationId: 'conv-100',
        direction: 'inbound',
        providerMessageId: 'prov-msg-999',
        content: 'Hello, need kitchen remodel',
        createdAt: new Date().toISOString(),
      });

      expect(saved).toBe(true);
      const msg = await repo.getMessageByProviderId('prov-msg-999');
      expect(msg).not.toBeNull();
      expect(msg?.content).toBe('Hello, need kitchen remodel');
    });

    it('7. Guarantees atomic idempotency: second message with same provider_message_id is rejected', async () => {
      const repo = new MemoryConversationRepository();

      const firstResult = await repo.saveMessage({
        id: 'msg-1',
        conversationId: 'conv-100',
        direction: 'inbound',
        providerMessageId: 'prov-msg-dup-1',
        content: 'First message',
        createdAt: new Date().toISOString(),
      });

      const secondResult = await repo.saveMessage({
        id: 'msg-2',
        conversationId: 'conv-100',
        direction: 'inbound',
        providerMessageId: 'prov-msg-dup-1', // Same ID!
        content: 'Duplicate message',
        createdAt: new Date().toISOString(),
      });

      expect(firstResult).toBe(true);
      expect(secondResult).toBe(false);
    });

    it('8. Filters leads by tenantId in multi-tenant persistence', async () => {
      const repo = new MemoryConversationRepository();

      const { Conversation: ConversationEntity } =
        await import('../../domain/conversation/entities/conversation');
      const convA = ConversationEntity.start(
        'conv-alpha-1' as unknown as import('../../shared/types').Uuid,
      );
      Object.assign(convA, { tenantId: 'tenant-alpha' });
      await repo.save(convA, 0);

      const convB = ConversationEntity.start(
        'conv-beta-1' as unknown as import('../../shared/types').Uuid,
      );
      Object.assign(convB, { tenantId: 'tenant-beta' });
      await repo.save(convB, 0);

      const allLeads = await repo.listLeads();
      expect(allLeads.length).toBe(2);

      const alphaLeads = await repo.listLeads('tenant-alpha');
      expect(alphaLeads.length).toBe(1);
      expect(alphaLeads[0]?.tenantId).toBe('tenant-alpha');

      const betaLeads = await repo.listLeads('tenant-beta');
      expect(betaLeads.length).toBe(1);
      expect(betaLeads[0]?.tenantId).toBe('tenant-beta');
    });
  });
});

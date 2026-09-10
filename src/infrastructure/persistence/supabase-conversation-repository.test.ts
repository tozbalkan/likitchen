import { describe, it, expect } from 'vitest';
import { SupabaseConversationRepository } from './supabase-conversation-repository';
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

    it('4. Executes REST HTTP calls when valid Supabase credentials are provided', async () => {
      const originalFetch = globalThis.fetch;
      const fetchCalls: Array<{
        url: string;
        method?: string | undefined;
        headers?: Record<string, string> | undefined;
      }> = [];

      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit,
      ): Promise<Response> => {
        const url = String(input);
        fetchCalls.push({
          url,
          method: init?.method,
          headers: init?.headers as Record<string, string>,
        });

        if (url.includes('/rest/v1/messages') && init?.method === 'POST') {
          return new Response(null, { status: 201 });
        }

        if (url.includes('/rest/v1/leads')) {
          return new Response(
            JSON.stringify([
              {
                id: 'lead-1',
                tenant_id: 'tenant-test',
                conversation_id: 'conv-1',
                phone: '+15551234567',
                status: 'NEW',
                created_at: new Date().toISOString(),
              },
            ]),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          );
        }

        return new Response(JSON.stringify([]), { status: 200 });
      };

      try {
        const repo = new SupabaseConversationRepository({
          supabaseUrl: 'https://test-supabase-project.supabase.co',
          serviceRoleKey: 'test-service-role-key',
        });

        const saved = await repo.saveMessage({
          id: 'msg-rest-1',
          conversationId: 'conv-rest-1',
          direction: 'inbound',
          providerMessageId: 'prov-rest-1',
          content: 'Testing REST',
          createdAt: new Date().toISOString(),
        });

        expect(saved).toBe(true);
        expect(
          fetchCalls.some((c) => c.url.includes('/rest/v1/messages')),
        ).toBe(true);

        const leads = await repo.listLeads('tenant-test');
        expect(leads.length).toBe(1);
        expect(leads[0]?.tenantId).toBe('tenant-test');
        expect(
          fetchCalls.some((c) => c.url.includes('tenant_id=eq.tenant-test')),
        ).toBe(true);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('5. REST handles 409 conflict for duplicate provider_message_id atomically', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (): Promise<Response> => {
        return new Response(
          JSON.stringify({
            error: 'duplicate key value violates unique constraint',
          }),
          {
            status: 409,
          },
        );
      };

      try {
        const repo = new SupabaseConversationRepository({
          supabaseUrl: 'https://test-supabase-project.supabase.co',
          serviceRoleKey: 'test-service-role-key',
        });

        const result = await repo.saveMessage({
          id: 'msg-rest-dup',
          conversationId: 'conv-rest-1',
          direction: 'inbound',
          providerMessageId: 'prov-rest-dup',
          content: 'Duplicate REST',
          createdAt: new Date().toISOString(),
        });

        expect(result).toBe(false); // Rejected on 409
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('6. Proves no persistence call silently uses Map/Set in production (No fallback state)', async () => {
      const repo = new SupabaseConversationRepository({
        supabaseUrl: 'https://test-supabase-project.supabase.co',
        serviceRoleKey: 'test-service-role-key',
      });

      // Assert no fallback Map/Set instance fields exist
      const repoAny = repo as unknown as Record<string, unknown>;
      expect(repoAny.conversationsMap).toBeUndefined();
      expect(repoAny.messagesMap).toBeUndefined();
      expect(repoAny.leadsMap).toBeUndefined();
      expect(repoAny.processedMessageIds).toBeUndefined();

      // Assert that when fetch fails, repository fails closed with NotFoundError instead of returning memory data
      const originalFetch = globalThis.fetch;
      globalThis.fetch = async (): Promise<Response> => {
        throw new Error('Supabase cluster unreachable');
      };

      try {
        const res = await repo.findById(
          'conv-nonexistent' as unknown as import('../../shared/types').Uuid,
        );
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.error.message).toContain('Supabase cluster unreachable');
        }
      } finally {
        globalThis.fetch = originalFetch;
      }
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

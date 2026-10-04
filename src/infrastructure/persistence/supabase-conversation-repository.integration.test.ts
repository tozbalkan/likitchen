import { describe, it, expect, afterAll } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import {
  SupabaseConversationRepository,
  SupabaseConversationUnitOfWork,
} from './supabase-conversation-repository';
import {
  conversationIdFor,
  handleWebhookPost,
  type WhatsAppWebhookDependencies,
} from '../../app/api/webhooks/whatsapp/handlers';
import { ConversationPipelineFacade } from '../../application/conversation/services/conversation-pipeline-facade';
import type { FactExtractionPort } from '../../application/conversation/ports/fact-extraction-port';
import { FactExtractionPromptBuilder } from '../ai/fact-extraction-prompt-builder';
import { DefaultConversationMerger } from '../../domain/conversation/pipeline/conversation-merger';
import { SystemClock } from '../clock/system-clock';
import { WebhookRateLimiter } from '../messaging/webhook-rate-limiter';
import { ok, err } from '../../shared/result';
import { createExtractionFailure } from '../../shared/errors/extraction';
import type { Uuid } from '../../shared/types';

/**
 * Runs the WhatsApp webhook against a REAL Supabase database (schema from docs/db/schema.sql).
 * Opt-in: `pnpm test:integration` (loads .env.local and sets SUPABASE_INTEGRATION=1).
 * Uses a random throwaway tenant and deletes everything it wrote afterwards.
 * Only fact extraction is stubbed; no OpenAI or Meta calls are made.
 */
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/+$/, '');
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const enabled =
  process.env.SUPABASE_INTEGRATION === '1' &&
  Boolean(supabaseUrl && serviceRoleKey);

class StubExtraction implements FactExtractionPort {
  failNext = false;

  async extractFacts(): ReturnType<FactExtractionPort['extractFacts']> {
    if (this.failNext) {
      this.failNext = false;
      return err(
        createExtractionFailure('PROVIDER_HTTP_ERROR', 'stubbed outage'),
      );
    }
    return ok({
      content: JSON.stringify({
        schema_version: 1,
        extractedFacts: {
          schema_version: 1,
          project_type: 'full_kitchen_remodel',
          location_raw: 'Nassau County',
          budget_range: '30k_60k',
          timeline: '3_6_months',
          attachments: [],
        },
        confidence: 0.95,
        missingInformation: [],
        suggestedFollowup: null,
        notes: 'integration stub',
      }),
    });
  }
}

describe.skipIf(!enabled)(
  'Supabase integration: WhatsApp webhook → database',
  () => {
    const tenantId = `it-${crypto.randomUUID().slice(0, 8)}`;
    const config = {
      appSecret: 'integration-secret',
      phoneNumberId: 'integration-phone',
      tenantId,
    };
    const customerPhone = `1555${Math.floor(1_000_000 + Math.random() * 8_999_999)}`;
    const conversationId = conversationIdFor(tenantId, customerPhone);

    // Placeholders keep construction from throwing while the suite is skipped.
    const repository = new SupabaseConversationRepository({
      supabaseUrl: supabaseUrl ?? 'http://integration-disabled.invalid',
      serviceRoleKey: serviceRoleKey ?? 'integration-disabled',
      tenantId,
    });
    const extraction = new StubExtraction();
    const pipeline = new ConversationPipelineFacade({
      conversationStore: repository,
      conversationUnitOfWork: new SupabaseConversationUnitOfWork(repository),
      extractionPort: extraction,
      promptBuilder: new FactExtractionPromptBuilder(),
      factMerger: new DefaultConversationMerger(),
      clock: new SystemClock(),
    });
    const deps: WhatsAppWebhookDependencies = {
      config,
      createRuntime: () => ({ inbox: repository, pipeline }),
      rateLimiter: new WebhookRateLimiter({ limit: 1000, windowMs: 60_000 }),
    };

    const send = (providerMessageId: string, text: string) => {
      const body = JSON.stringify({
        entry: [
          {
            changes: [
              {
                field: 'messages',
                value: {
                  metadata: { phone_number_id: config.phoneNumberId },
                  messages: [
                    {
                      id: providerMessageId,
                      from: customerPhone,
                      type: 'text',
                      text: { body: text },
                    },
                  ],
                },
              },
            ],
          },
        ],
      });
      const hmac = crypto
        .createHmac('sha256', config.appSecret)
        .update(body, 'utf8')
        .digest('hex');
      return handleWebhookPost(
        new NextRequest('http://localhost/api/webhooks/whatsapp', {
          method: 'POST',
          headers: { 'x-hub-signature-256': `sha256=${hmac}` },
          body,
        }),
        deps,
      );
    };

    afterAll(async () => {
      // conversations cascade to messages and leads
      await fetch(
        `${supabaseUrl}/rest/v1/conversations?tenant_id=eq.${encodeURIComponent(tenantId)}`,
        {
          method: 'DELETE',
          headers: {
            apikey: serviceRoleKey ?? '',
            Authorization: `Bearer ${serviceRoleKey ?? ''}`,
          },
        },
      );
    });

    it('1. First message from a new customer creates conversation, message and lead', async () => {
      const res = await send(
        `wamid.it.${crypto.randomUUID()}`,
        'Full kitchen remodel in Nassau County',
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toMatchObject({ processed: 1, skipped: 0 });

      const conversation =
        await repository.getConversationRecord(conversationId);
      expect(conversation?.tenantId).toBe(tenantId);
      expect(conversation?.phoneNumber).toBe(customerPhone);
      expect(conversation?.facts.location_raw).toBe('Nassau County');
      expect(conversation?.revision).toBeGreaterThan(0);

      const leads = await repository.listLeads();
      expect(leads).toHaveLength(1);
      expect(leads[0]).toMatchObject({
        phone: customerPhone,
        projectType: 'full_kitchen_remodel',
        status: 'NEW',
        humanTakeover: false,
      });
    });

    it('2. A duplicate delivery is skipped and does not touch the conversation', async () => {
      const providerMessageId = `wamid.it.${crypto.randomUUID()}`;
      await send(providerMessageId, 'Budget is around 40k');
      const before = await repository.getConversationRecord(conversationId);

      const res = await send(providerMessageId, 'Budget is around 40k');
      expect(await res.json()).toMatchObject({ processed: 0, skipped: 1 });

      const after = await repository.getConversationRecord(conversationId);
      expect(after?.revision).toBe(before?.revision);
      expect(
        (await repository.getMessageByProviderId(providerMessageId))
          ?.processedAt,
      ).toBeDefined();
    });

    it('3. A message whose pipeline failed is reprocessed on Meta’s retry', async () => {
      const providerMessageId = `wamid.it.${crypto.randomUUID()}`;
      extraction.failNext = true;

      const failed = await send(providerMessageId, 'We want to start soon');
      expect(failed.status).toBe(500);
      expect(
        (await repository.getMessageByProviderId(providerMessageId))
          ?.processedAt,
      ).toBeUndefined();

      const retried = await send(providerMessageId, 'We want to start soon');
      expect(retried.status).toBe(200);
      expect(await retried.json()).toMatchObject({ processed: 1 });
      expect(
        (await repository.getMessageByProviderId(providerMessageId))
          ?.processedAt,
      ).toBeDefined();
    });

    it('4. Concurrent writers loading the same revision: the second save is rejected', async () => {
      const first = await repository.findById(conversationId as Uuid);
      const second = await repository.findById(conversationId as Uuid);
      if (!first.ok || !second.ok) throw new Error('conversation not loaded');

      const now = new Date().toISOString() as never;
      first.value.continue(1, crypto.randomUUID() as Uuid, now);
      second.value.continue(1, crypto.randomUUID() as Uuid, now);

      expect((await repository.save(first.value, 0)).ok).toBe(true);
      const conflict = await repository.save(second.value, 0);
      expect(conflict.ok).toBe(false);
      if (!conflict.ok) expect(conflict.error.code).toBe('CONFLICT_FAILURE');
    });

    it.skipIf(!anonKey)(
      '5. RLS: the anon key cannot read this tenant’s rows even though they exist',
      async () => {
        for (const table of ['conversations', 'messages', 'leads']) {
          const res = await fetch(
            `${supabaseUrl}/rest/v1/${table}?tenant_id=eq.${encodeURIComponent(tenantId)}&select=id`,
            {
              headers: {
                apikey: anonKey ?? '',
                Authorization: `Bearer ${anonKey ?? ''}`,
              },
            },
          );
          const rows = res.ok ? ((await res.json()) as unknown[]) : [];
          expect(rows, `${table} visible to anon`).toHaveLength(0);
        }
        expect((await repository.listLeads()).length).toBeGreaterThan(0);
      },
    );
  },
);

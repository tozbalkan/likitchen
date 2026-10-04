import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import {
  conversationIdFor,
  handleWebhookPost,
  type WebhookInbox,
  type WebhookPipeline,
  type WhatsAppWebhookDependencies,
} from './handlers';
import { WebhookRateLimiter } from '../../../../infrastructure/messaging/webhook-rate-limiter';
import type { InboundMessageStatus } from '../../../../infrastructure/persistence/supabase-conversation-repository';
import { ok, err } from '../../../../shared/result';

const config = {
  appSecret: 'handler-test-secret',
  phoneNumberId: 'biz-phone-1',
  tenantId: 'tenant-test',
};

class FakeInbox implements WebhookInbox {
  readonly log: string[] = [];
  readonly processed = new Set<string>();
  readonly recorded = new Map<string, string>();

  async ensureConversation(conversationId: string): Promise<void> {
    this.log.push(`ensure:${conversationId}`);
  }

  async recordInboundMessage(msg: {
    conversationId: string;
    providerMessageId: string;
    content: string;
  }): Promise<InboundMessageStatus> {
    this.log.push(`record:${msg.providerMessageId}`);
    if (this.recorded.has(msg.providerMessageId)) {
      return this.processed.has(msg.providerMessageId)
        ? 'already_processed'
        : 'retry';
    }
    this.recorded.set(msg.providerMessageId, msg.content);
    return 'new';
  }

  async markMessageProcessed(providerMessageId: string): Promise<void> {
    this.log.push(`processed:${providerMessageId}`);
    this.processed.add(providerMessageId);
  }
}

class FakePipeline implements WebhookPipeline {
  readonly texts: string[] = [];
  failNext = false;

  async processIncomingMessage(
    _conversationId: Parameters<WebhookPipeline['processIncomingMessage']>[0],
    messageText: string,
  ): ReturnType<WebhookPipeline['processIncomingMessage']> {
    this.texts.push(messageText);
    if (this.failNext) {
      this.failNext = false;
      return err({
        code: 'PersistenceError',
        message: 'internal db detail',
      });
    }
    return ok({ replyText: 'ok', isReadyForHandoff: false });
  }
}

function signedRequest(payload: unknown): NextRequest {
  const body = JSON.stringify(payload);
  const hmac = crypto
    .createHmac('sha256', config.appSecret)
    .update(body, 'utf8')
    .digest('hex');
  return new NextRequest('http://localhost/api/webhooks/whatsapp', {
    method: 'POST',
    headers: { 'x-hub-signature-256': `sha256=${hmac}` },
    body,
  });
}

function payloadWith(
  messages: Array<Record<string, unknown>>,
  phoneNumberId = config.phoneNumberId,
): unknown {
  return {
    entry: [
      {
        changes: [
          {
            field: 'messages',
            value: { metadata: { phone_number_id: phoneNumberId }, messages },
          },
        ],
      },
    ],
  };
}

const textMessage = (id: string, body: string, from = '15550001111') => ({
  id,
  from,
  type: 'text',
  text: { body },
});

describe('WhatsApp webhook processing order, deduplication and retries', () => {
  let inbox: FakeInbox;
  let pipeline: FakePipeline;
  let deps: WhatsAppWebhookDependencies;

  beforeEach(() => {
    inbox = new FakeInbox();
    pipeline = new FakePipeline();
    deps = {
      config,
      createRuntime: () => ({ inbox, pipeline }),
      rateLimiter: new WebhookRateLimiter({ limit: 1000, windowMs: 60_000 }),
    };
  });

  it('1. Ensures the conversation exists before recording the message, and marks it processed after the pipeline', async () => {
    const res = await handleWebhookPost(
      signedRequest(payloadWith([textMessage('wamid.1', 'Kitchen remodel')])),
      deps,
    );

    expect(res.status).toBe(200);
    const conversationId = conversationIdFor(config.tenantId, '15550001111');
    expect(inbox.log).toEqual([
      `ensure:${conversationId}`,
      'record:wamid.1',
      'processed:wamid.1',
    ]);
    expect(pipeline.texts).toEqual(['Kitchen remodel']);
  });

  it('2. Processes every message in the payload, not only the first', async () => {
    const res = await handleWebhookPost(
      signedRequest(
        payloadWith([
          textMessage('wamid.a', 'first'),
          textMessage('wamid.b', 'second', '15550002222'),
        ]),
      ),
      deps,
    );

    expect(res.status).toBe(200);
    expect(pipeline.texts).toEqual(['first', 'second']);
    expect(await res.json()).toMatchObject({ processed: 2, skipped: 0 });
  });

  it('3. Skips a duplicate delivery of an already processed message', async () => {
    const req = () =>
      signedRequest(payloadWith([textMessage('wamid.dup', 'hello')]));
    await handleWebhookPost(req(), deps);
    const res = await handleWebhookPost(req(), deps);

    expect(pipeline.texts).toEqual(['hello']);
    expect(await res.json()).toMatchObject({ processed: 0, skipped: 1 });
  });

  it('4. A failed message returns 500 without being marked processed, and Meta’s retry reprocesses it', async () => {
    pipeline.failNext = true;
    const req = () =>
      signedRequest(payloadWith([textMessage('wamid.fail', 'retry me')]));

    const failed = await handleWebhookPost(req(), deps);
    expect(failed.status).toBe(500);
    expect(inbox.processed.has('wamid.fail')).toBe(false);

    const retried = await handleWebhookPost(req(), deps);
    expect(retried.status).toBe(200);
    expect(inbox.processed.has('wamid.fail')).toBe(true);
    expect(pipeline.texts).toEqual(['retry me', 'retry me']);
  });

  it('5. Error responses do not leak internal error details', async () => {
    pipeline.failNext = true;
    const res = await handleWebhookPost(
      signedRequest(payloadWith([textMessage('wamid.leak', 'x')])),
      deps,
    );
    const text = await res.text();
    expect(text).not.toContain('internal db detail');
    expect(text).not.toContain('PersistenceError');
  });

  it('6. Non-text messages are stored and marked processed without running fact extraction', async () => {
    const res = await handleWebhookPost(
      signedRequest(
        payloadWith([{ id: 'wamid.img', from: '15550001111', type: 'image' }]),
      ),
      deps,
    );

    expect(res.status).toBe(200);
    expect(pipeline.texts).toEqual([]);
    expect(inbox.recorded.get('wamid.img')).toBe('[image]');
    expect(inbox.processed.has('wamid.img')).toBe(true);
  });

  it('7. Rejects messages addressed to another business phone number before touching persistence', async () => {
    const res = await handleWebhookPost(
      signedRequest(payloadWith([textMessage('wamid.x', 'x')], 'other-phone')),
      deps,
    );
    expect(res.status).toBe(403);
    expect(inbox.log).toEqual([]);
  });

  it('8. Fails closed with 500 when the tenant configuration is missing', async () => {
    const originalTenant = process.env.WHATSAPP_TENANT_ID;
    delete process.env.WHATSAPP_TENANT_ID;
    try {
      const res = await handleWebhookPost(
        signedRequest(payloadWith([textMessage('wamid.cfg', 'x')])),
        { createRuntime: () => ({ inbox, pipeline }) },
      );
      expect(res.status).toBe(500);
      expect(inbox.log).toEqual([]);
    } finally {
      if (originalTenant) process.env.WHATSAPP_TENANT_ID = originalTenant;
    }
  });

  it('9. Conversation ids are tenant-scoped, fit VARCHAR(64) and do not embed the phone number', () => {
    const a = conversationIdFor('tenant-a', '15550001111');
    const b = conversationIdFor('tenant-b', '15550001111');
    expect(a).not.toBe(b);
    expect(a.length).toBeLessThanOrEqual(64);
    expect(a).not.toContain('15550001111');
  });
});

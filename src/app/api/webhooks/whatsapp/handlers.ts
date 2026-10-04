import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import {
  safeEqualSecret,
  verifyMetaSignature,
} from '../../../../infrastructure/messaging/whatsapp-webhook-security';
import { WebhookRateLimiter } from '../../../../infrastructure/messaging/webhook-rate-limiter';
import { ConversationPipelineFacade } from '../../../../application/conversation/services/conversation-pipeline-facade';
import { OpenAiFactExtractionAdapter } from '../../../../infrastructure/ai/openai-fact-extraction-adapter';
import { FactExtractionPromptBuilder } from '../../../../infrastructure/ai/fact-extraction-prompt-builder';
import { DefaultConversationMerger } from '../../../../domain/conversation/pipeline/conversation-merger';
import { SystemClock } from '../../../../infrastructure/clock/system-clock';
import {
  SupabaseConversationRepository,
  SupabaseConversationUnitOfWork,
  type InboundMessageStatus,
} from '../../../../infrastructure/persistence/supabase-conversation-repository';
import { MetaWhatsAppAdapter } from '../../../../infrastructure/providers/adapters/meta-whatsapp-adapter';
import type { Uuid } from '../../../../shared/types';

export interface WhatsAppWebhookConfig {
  readonly appSecret: string;
  readonly phoneNumberId: string;
  readonly tenantId: string;
}

/** Persistence operations the webhook needs, in the order it calls them. */
export interface WebhookInbox {
  ensureConversation(
    conversationId: string,
    phoneNumber: string,
  ): Promise<void>;
  recordInboundMessage(msg: {
    readonly conversationId: string;
    readonly providerMessageId: string;
    readonly content: string;
  }): Promise<InboundMessageStatus>;
  markMessageProcessed(providerMessageId: string): Promise<void>;
}

export type WebhookPipeline = Pick<
  ConversationPipelineFacade,
  'processIncomingMessage'
>;

export interface WebhookRuntime {
  readonly inbox: WebhookInbox;
  readonly pipeline: WebhookPipeline;
}

export interface WhatsAppWebhookDependencies {
  readonly config?: WhatsAppWebhookConfig;
  readonly createRuntime?: (config: WhatsAppWebhookConfig) => WebhookRuntime;
  readonly rateLimiter?: WebhookRateLimiter;
}

interface InboundWhatsAppMessage {
  readonly providerMessageId: string;
  readonly from: string;
  readonly type: string;
  readonly text: string;
}

const defaultRateLimiter = new WebhookRateLimiter({
  limit: 60,
  windowMs: 60_000,
});

let cachedRuntime: { tenantId: string; runtime: WebhookRuntime } | null = null;

function createProductionRuntime(
  config: WhatsAppWebhookConfig,
): WebhookRuntime {
  if (cachedRuntime?.tenantId === config.tenantId) {
    return cachedRuntime.runtime;
  }
  // Fails closed if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing.
  const repository = new SupabaseConversationRepository({
    tenantId: config.tenantId,
  });
  const pipeline = new ConversationPipelineFacade({
    conversationStore: repository,
    conversationUnitOfWork: new SupabaseConversationUnitOfWork(repository),
    extractionPort: new OpenAiFactExtractionAdapter(),
    promptBuilder: new FactExtractionPromptBuilder(),
    factMerger: new DefaultConversationMerger(),
    clock: new SystemClock(),
    messageDeliveryPort: new MetaWhatsAppAdapter(),
  });
  const runtime: WebhookRuntime = { inbox: repository, pipeline };
  cachedRuntime = { tenantId: config.tenantId, runtime };
  return runtime;
}

function readConfigFromEnv(): WhatsAppWebhookConfig | null {
  const appSecret = process.env.WHATSAPP_APP_SECRET?.trim();
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
  const tenantId = process.env.WHATSAPP_TENANT_ID?.trim();
  if (!appSecret || !phoneNumberId || !tenantId) return null;
  return { appSecret, phoneNumberId, tenantId };
}

/**
 * Deterministic conversation id per (tenant, customer phone).
 * Hashed so it fits the VARCHAR(64) key and does not embed the phone number.
 */
export function conversationIdFor(
  tenantId: string,
  phoneNumber: string,
): string {
  const digest = crypto
    .createHash('sha256')
    .update(`${tenantId}:${phoneNumber}`, 'utf8')
    .digest('hex');
  return `conv_${digest.slice(0, 40)}`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object'
    ? (value as Record<string, unknown>)
    : undefined;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/**
 * Collects every inbound message across all entries and changes.
 * Returns null if any change carrying messages targets a different business phone number.
 */
function extractMessages(
  payload: Record<string, unknown>,
  expectedPhoneNumberId: string,
): InboundWhatsAppMessage[] | null {
  const collected: InboundWhatsAppMessage[] = [];

  for (const entry of asArray(payload.entry)) {
    for (const change of asArray(asRecord(entry)?.changes)) {
      const value = asRecord(asRecord(change)?.value);
      const messages = asArray(value?.messages);
      if (messages.length === 0) continue;

      const phoneNumberId = asRecord(value?.metadata)?.phone_number_id;
      if (phoneNumberId !== expectedPhoneNumberId) {
        return null;
      }

      for (const raw of messages) {
        const msg = asRecord(raw);
        const id = msg?.id;
        const from = msg?.from;
        if (
          typeof id !== 'string' ||
          !id ||
          typeof from !== 'string' ||
          !from
        ) {
          continue;
        }
        const type = typeof msg?.type === 'string' ? msg.type : 'text';
        const body = asRecord(msg?.text)?.body;
        collected.push({
          providerMessageId: id,
          from,
          type,
          text: typeof body === 'string' ? body : '',
        });
      }
    }
  }

  return collected;
}

/**
 * GET Handler for Meta Verification Challenge.
 */
export async function handleWebhookGet(
  request: NextRequest,
): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  // Fail closed: missing verify token in env configuration
  if (!verifyToken) {
    return NextResponse.json(
      { error: 'Webhook verification token configuration missing' },
      { status: 500 },
    );
  }

  if (
    mode === 'subscribe' &&
    safeEqualSecret(token, verifyToken) &&
    challenge
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST Handler for Incoming Meta WhatsApp Webhook Payload.
 *
 * Processing order per message:
 * ensure conversation → record message (dedup) → pipeline → mark processed.
 * A message is marked processed only after the pipeline succeeds, so when this handler
 * returns 500 Meta's retry reprocesses the unfinished messages and skips finished ones.
 */
export async function handleWebhookPost(
  request: NextRequest,
  deps?: WhatsAppWebhookDependencies,
): Promise<NextResponse> {
  // 1. Fail Closed: missing security / tenant configuration
  const config = deps?.config ?? readConfigFromEnv();
  if (!config) {
    console.error(
      '[whatsapp-webhook] Missing WHATSAPP_APP_SECRET, WHATSAPP_PHONE_NUMBER_ID or WHATSAPP_TENANT_ID.',
    );
    return NextResponse.json(
      { error: 'Webhook security configuration missing' },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-hub-signature-256');

  // 2. Meta HMAC Verification: missing or invalid HMAC SHA-256 signature
  if (!verifyMetaSignature(rawBody, signatureHeader, config.appSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = asRecord(JSON.parse(rawBody)) ?? {};
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON payload' },
      { status: 400 },
    );
  }

  // 3. Business phone_number_id validation (mandatory for every change carrying messages)
  const messages = extractMessages(payload, config.phoneNumberId);
  if (messages === null) {
    return NextResponse.json(
      { error: 'Business phone number ID mismatch' },
      { status: 403 },
    );
  }

  // 4. Rate Limiting Protection, evaluated only after authentication
  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    'default-client';
  const rateLimitResult = (deps?.rateLimiter ?? defaultRateLimiter).check(
    clientIp,
  );
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: 'Too Many Requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(rateLimitResult.retryAfterSeconds) },
      },
    );
  }

  // Status updates (delivered/read receipts) carry no messages.
  if (messages.length === 0) {
    return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
  }

  let processed = 0;
  let skipped = 0;

  try {
    const runtime = (deps?.createRuntime ?? createProductionRuntime)(config);

    for (const message of messages) {
      const conversationId = conversationIdFor(config.tenantId, message.from);
      const isText = message.type === 'text' && message.text.trim() !== '';

      await runtime.inbox.ensureConversation(conversationId, message.from);
      const status = await runtime.inbox.recordInboundMessage({
        conversationId,
        providerMessageId: message.providerMessageId,
        content: isText ? message.text : `[${message.type}]`,
      });

      if (status === 'already_processed') {
        skipped++;
        continue;
      }

      // Non-text messages (image, audio, …) are stored but not run through fact extraction yet.
      if (isText) {
        const result = await runtime.pipeline.processIncomingMessage(
          conversationId as Uuid,
          message.text,
          0,
          message.from,
        );
        if (!result.ok) {
          throw new Error(
            `Pipeline failed for message ${message.providerMessageId}: ${result.error.code} ${result.error.message}`,
          );
        }
      }

      await runtime.inbox.markMessageProcessed(message.providerMessageId);
      processed++;
    }
  } catch (e: unknown) {
    console.error(
      '[whatsapp-webhook] Processing failed; Meta will retry unfinished messages.',
      e instanceof Error ? e.message : e,
    );
    return NextResponse.json({ error: 'Processing failed' }, { status: 500 });
  }

  return NextResponse.json(
    { status: 'PROCESSED', processed, skipped },
    { status: 200 },
  );
}

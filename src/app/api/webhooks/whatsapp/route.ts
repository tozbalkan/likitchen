import { NextResponse, type NextRequest } from 'next/server';
import { verifyMetaSignature } from '../../../../infrastructure/messaging/whatsapp-webhook-security';
import { WebhookRateLimiter } from '../../../../infrastructure/messaging/webhook-rate-limiter';
import { ConversationPipelineFacade } from '../../../../application/conversation/services/conversation-pipeline-facade';
import { OpenAiFactExtractionAdapter } from '../../../../infrastructure/ai/openai-fact-extraction-adapter';
import { FactExtractionPromptBuilder } from '../../../../infrastructure/ai/fact-extraction-prompt-builder';
import { DefaultConversationMerger } from '../../../../domain/conversation/pipeline/conversation-merger';
import { SystemClock } from '../../../../infrastructure/clock/system-clock';
import {
  SupabaseConversationRepository,
  SupabaseConversationUnitOfWork,
} from '../../../../infrastructure/persistence/supabase-conversation-repository';
import { MetaWhatsAppAdapter } from '../../../../infrastructure/providers/adapters/meta-whatsapp-adapter';
import type { Uuid } from '../../../../shared/types';

const rateLimiter = new WebhookRateLimiter({ limit: 60, windowMs: 60_000 });

let cachedProductionPipeline: {
  repository: SupabaseConversationRepository;
  pipelineFacade: ConversationPipelineFacade;
} | null = null;

function getProductionPipeline(): {
  repository: SupabaseConversationRepository;
  pipelineFacade: ConversationPipelineFacade;
} {
  if (cachedProductionPipeline) {
    return cachedProductionPipeline;
  }
  // Strictly requires valid SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Fails closed if missing.
  const repository = new SupabaseConversationRepository();
  const uow = new SupabaseConversationUnitOfWork(repository);
  const metaAdapter = new MetaWhatsAppAdapter();

  const pipelineFacade = new ConversationPipelineFacade({
    conversationStore: repository,
    conversationUnitOfWork: uow,
    extractionPort: new OpenAiFactExtractionAdapter(),
    promptBuilder: new FactExtractionPromptBuilder(),
    factMerger: new DefaultConversationMerger(),
    clock: new SystemClock(),
    messageDeliveryPort: metaAdapter,
  });

  cachedProductionPipeline = { repository, pipelineFacade };
  return cachedProductionPipeline;
}

/**
 * GET Handler for Meta Verification Challenge.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST Handler for Incoming Meta WhatsApp Webhook Payload.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // 1. Fail Closed: missing application secret configuration
  if (!appSecret) {
    return NextResponse.json(
      { error: 'Webhook security configuration missing' },
      { status: 500 },
    );
  }

  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-hub-signature-256');

  // 2. Meta HMAC Verification: missing or invalid HMAC SHA-256 signature
  if (!verifyMetaSignature(rawBody, signatureHeader, appSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;

    // Extract Meta Webhook entry & changes
    const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Array<Record<string, unknown>>;
    const metadata = value?.metadata as
      { phone_number_id?: string } | undefined;

    // 3. Business phone_number_id Validation / Trusted Tenant Resolution
    const expectedPhoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (expectedPhoneNumberId && metadata?.phone_number_id) {
      if (metadata.phone_number_id !== expectedPhoneNumberId) {
        return NextResponse.json(
          { error: 'Business phone number ID mismatch' },
          { status: 403 },
        );
      }
    }

    // 4. Rate Limiting Protection (Single-instance DOS / brute-force guard)
    // Evaluated only AFTER authenticating HMAC and verifying business phone_number_id
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'default-client';
    const rateLimitResult = rateLimiter.check(clientIp);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: 'Too Many Requests' },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfterSeconds),
          },
        },
      );
    }

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    const firstMsg = messages[0];
    const providerMessageId = (firstMsg?.id as string) ?? '';
    const from = (firstMsg?.from as string) ?? '';
    const textObj = firstMsg?.text as { body?: string } | undefined;
    const bodyText = textObj?.body ?? '';

    // 3. Resolve Production Persistence (Fails closed if SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing)
    let persistence: {
      repository: SupabaseConversationRepository;
      pipelineFacade: ConversationPipelineFacade;
    };
    try {
      persistence = getProductionPipeline();
    } catch (err: unknown) {
      return NextResponse.json(
        {
          error: `Production persistence configuration missing: ${err instanceof Error ? err.message : 'Unknown error'}`,
        },
        { status: 500 },
      );
    }
    const { repository, pipelineFacade } = persistence;

    // 4. Database Atomic Idempotency Check (attempts atomic insertion on UNIQUE constraint)
    const isFirstDelivery = await repository.saveMessage({
      id: `msg-${Date.now()}`,
      conversationId: `conv-${from}`,
      direction: 'inbound',
      providerMessageId,
      content: bodyText,
      createdAt: new Date().toISOString(),
    });

    if (!isFirstDelivery) {
      return NextResponse.json(
        { status: 'DUPLICATE_IGNORED' },
        { status: 200 },
      );
    }

    // 5. Invoke Production Execution Path (ProcessUserMessageUseCase via Pipeline Facade)
    const conversationId = `conv-${from}` as Uuid;
    const result = await pipelineFacade.processIncomingMessage(
      conversationId,
      bodyText,
      0,
      from,
    );

    // Fail closed: propagate error if any pipeline step fails
    if (!result.ok) {
      return NextResponse.json(
        { error: `Pipeline execution failed: ${result.error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        status: 'PROCESSED',
        replyText: result.value.replyText,
        isReadyForHandoff: result.value.isReadyForHandoff,
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

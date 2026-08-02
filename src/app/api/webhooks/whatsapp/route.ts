import { NextResponse, type NextRequest } from 'next/server';
import { verifyMetaSignature } from '../../../../infrastructure/messaging/whatsapp-webhook-security';
import { WhatsAppMessageDeduplicator } from '../../../../infrastructure/messaging/whatsapp-message-deduplicator';

const deduplicator = new WhatsAppMessageDeduplicator();

/**
 * GET Handler for Meta Verification Challenge.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken =
    process.env.WHATSAPP_VERIFY_TOKEN ?? 'likitchen_verify_token';

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}

/**
 * POST Handler for Incoming Meta WhatsApp Webhook Payload.
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const rawBody = await request.text();
  const signatureHeader = request.headers.get('x-hub-signature-256');
  const appSecret = process.env.WHATSAPP_APP_SECRET;

  // 1. P0 Security: HMAC SHA-256 Verification (skip if appSecret not set in DEV)
  if (appSecret && !verifyMetaSignature(rawBody, signatureHeader, appSecret)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  try {
    const payload = JSON.parse(rawBody) as Record<string, unknown>;

    // Extract Meta Webhook entry & changes
    const entry = (payload.entry as Array<Record<string, unknown>>)?.[0];
    const changes = (entry?.changes as Array<Record<string, unknown>>)?.[0];
    const value = changes?.value as Record<string, unknown>;
    const messages = value?.messages as Array<Record<string, unknown>>;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'EVENT_RECEIVED' }, { status: 200 });
    }

    const firstMsg = messages[0];
    const providerMessageId = (firstMsg?.id as string) ?? '';
    const from = (firstMsg?.from as string) ?? '';
    const textObj = firstMsg?.text as { body?: string } | undefined;
    const bodyText = textObj?.body ?? '';

    // 2. Deduplication check
    if (providerMessageId && deduplicator.isDuplicate(providerMessageId)) {
      return NextResponse.json(
        { status: 'DUPLICATE_IGNORED' },
        { status: 200 },
      );
    }

    return NextResponse.json(
      {
        status: 'PROCESSED',
        message: {
          id: providerMessageId,
          from,
          text: bodyText,
        },
      },
      { status: 200 },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid JSON payload';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

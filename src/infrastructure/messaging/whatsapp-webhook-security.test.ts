import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import crypto from 'node:crypto';
import { NextRequest } from 'next/server';
import { verifyMetaSignature } from './whatsapp-webhook-security';
import { WhatsAppMessageDeduplicator } from './whatsapp-message-deduplicator';
import { GET, POST } from '../../app/api/webhooks/whatsapp/route';

describe('R2: WhatsApp Webhook Security (Fail Closed Tests)', () => {
  const secret = 'my_super_secret_app_key';
  const verifyToken = 'my_verify_token_123';
  const body = JSON.stringify({ event: 'message_received', text: 'Hello' });

  const originalSecret = process.env.WHATSAPP_APP_SECRET;
  const originalVerifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  beforeEach(() => {
    process.env.WHATSAPP_APP_SECRET = secret;
    process.env.WHATSAPP_VERIFY_TOKEN = verifyToken;
  });

  afterEach(() => {
    process.env.WHATSAPP_APP_SECRET = originalSecret;
    process.env.WHATSAPP_VERIFY_TOKEN = originalVerifyToken;
  });

  it('1. Validates correct HMAC SHA-256 signature using timingSafeEqual', () => {
    const validHmac = crypto
      .createHmac('sha256', secret)
      .update(body, 'utf8')
      .digest('hex');
    const signatureHeader = `sha256=${validHmac}`;

    expect(verifyMetaSignature(body, signatureHeader, secret)).toBe(true);
  });

  it('2. Rejects invalid or tampered signatures', () => {
    const invalidSignature =
      'sha256=bad1234567890123456789012345678901234567890123456789012345678901';
    expect(verifyMetaSignature(body, invalidSignature, secret)).toBe(false);
    expect(verifyMetaSignature(body, null, secret)).toBe(false);
    expect(verifyMetaSignature('', 'sha256=123', secret)).toBe(false);
  });

  it('3. Fails closed with 500 when WHATSAPP_APP_SECRET is missing in POST', async () => {
    delete process.env.WHATSAPP_APP_SECRET;
    const req = new NextRequest('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it('4. Fails closed with 401 when signature header is missing or invalid in POST', async () => {
    const req = new NextRequest('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      body,
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('5. Fails closed with 500 when WHATSAPP_VERIFY_TOKEN is missing in GET', async () => {
    delete process.env.WHATSAPP_VERIFY_TOKEN;
    const req = new NextRequest(
      'http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=token&hub.challenge=123',
    );
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it('6. Accepts valid verification challenge when verify_token matches', async () => {
    const req = new NextRequest(
      `http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=challenge_text`,
    );
    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('challenge_text');
  });

  it('7. Deduplicates repeated provider message IDs', () => {
    const deduplicator = new WhatsAppMessageDeduplicator();
    expect(deduplicator.isDuplicate('msg-100')).toBe(false);
    expect(deduplicator.isDuplicate('msg-100')).toBe(true);
    expect(deduplicator.isDuplicate('msg-101')).toBe(false);
  });
});

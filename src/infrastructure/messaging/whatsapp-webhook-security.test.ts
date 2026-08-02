import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import { verifyMetaSignature } from './whatsapp-webhook-security';
import { WhatsAppMessageDeduplicator } from './whatsapp-message-deduplicator';

describe('Milestone 030.2: WhatsApp Webhook Security & Deduplication', () => {
  const secret = 'my_super_secret_app_key';
  const body = JSON.stringify({ event: 'message_received', text: 'Hello' });

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

  it('3. Deduplicates repeated provider message IDs', () => {
    const deduplicator = new WhatsAppMessageDeduplicator();
    expect(deduplicator.isDuplicate('msg-100')).toBe(false);
    expect(deduplicator.isDuplicate('msg-100')).toBe(true); // Repeated!
    expect(deduplicator.isDuplicate('msg-101')).toBe(false);
  });
});

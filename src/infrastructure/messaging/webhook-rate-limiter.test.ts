import { describe, it, expect } from 'vitest';
import { WebhookRateLimiter } from './webhook-rate-limiter';
import { NextRequest } from 'next/server';
import crypto from 'node:crypto';
import { POST } from '../../app/api/webhooks/whatsapp/route';

describe('R2-RL: Webhook Rate Limiter & DOS Protection Tests', () => {
  it('1. Allows requests under the rate limit', () => {
    const limiter = new WebhookRateLimiter({ limit: 3, windowMs: 10_000 });
    const r1 = limiter.check('192.168.1.1');
    const r2 = limiter.check('192.168.1.1');

    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);
  });

  it('2. Rejects requests that exceed the rate limit', () => {
    const limiter = new WebhookRateLimiter({ limit: 2, windowMs: 10_000 });
    limiter.check('client-a');
    limiter.check('client-a');
    const r3 = limiter.check('client-a');

    expect(r3.allowed).toBe(false);
    expect(r3.remaining).toBe(0);
    expect(r3.retryAfterSeconds).toBeGreaterThanOrEqual(1);
  });

  it('3. Isolates rate limits by client identifier', () => {
    const limiter = new WebhookRateLimiter({ limit: 1, windowMs: 10_000 });
    const rA1 = limiter.check('client-alpha');
    const rA2 = limiter.check('client-alpha');
    const rB1 = limiter.check('client-beta');

    expect(rA1.allowed).toBe(true);
    expect(rA2.allowed).toBe(false);
    expect(rB1.allowed).toBe(true); // Different client not blocked
  });

  it('4. POST route returns 429 when client exceeds webhook rate limit', async () => {
    const secret = 'test-secret';
    process.env.WHATSAPP_APP_SECRET = secret;
    const body = JSON.stringify({ entry: [] });
    const hmac = crypto.createHmac('sha256', secret).update(body).digest('hex');

    const ip = '203.0.113.199';

    // Fire 60 requests to exhaust limit
    for (let i = 0; i < 60; i++) {
      const req = new NextRequest('http://localhost/api/webhooks/whatsapp', {
        method: 'POST',
        headers: {
          'x-hub-signature-256': `sha256=${hmac}`,
          'x-forwarded-for': ip,
        },
        body,
      });
      await POST(req);
    }

    // 61st request must receive 429 Too Many Requests
    const throttledReq = new NextRequest(
      'http://localhost/api/webhooks/whatsapp',
      {
        method: 'POST',
        headers: {
          'x-hub-signature-256': `sha256=${hmac}`,
          'x-forwarded-for': ip,
        },
        body,
      },
    );
    const res = await POST(throttledReq);
    expect(res.status).toBe(429);
    expect(res.headers.get('Retry-After')).toBeDefined();
  });
});

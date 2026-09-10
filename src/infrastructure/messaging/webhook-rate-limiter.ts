/**
 * Webhook Rate Limiter for Incoming Meta WhatsApp Webhooks.
 *
 * ARCHITECTURAL LIMITATION & PRODUCTION BLOCKER:
 * This in-memory rate limiter provides per-process rate-limiting for single-instance
 * deployments. In a horizontally scaled multi-instance container or serverless
 * environment (e.g. AWS ECS, Kubernetes, Vercel Serverless), rate limits are not shared
 * across processes. Distributed durable rate-limiting is BLOCKED pending integration
 * of an external distributed key-value store (e.g., Redis, Upstash, or PostgreSQL token-bucket).
 */
export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export class WebhookRateLimiter {
  private readonly requestTimestamps = new Map<string, number[]>();
  private readonly defaultLimit: number;
  private readonly defaultWindowMs: number;

  constructor(options?: { limit?: number; windowMs?: number }) {
    this.defaultLimit = options?.limit ?? 60; // 60 requests
    this.defaultWindowMs = options?.windowMs ?? 60_000; // per 1 minute
  }

  public check(
    identifier: string,
    customLimit?: number,
    customWindowMs?: number,
  ): RateLimitResult {
    const limit = customLimit ?? this.defaultLimit;
    const windowMs = customWindowMs ?? this.defaultWindowMs;
    const now = Date.now();
    const windowStart = now - windowMs;

    const timestamps = this.requestTimestamps.get(identifier) ?? [];
    const validTimestamps = timestamps.filter((ts) => ts > windowStart);

    if (validTimestamps.length >= limit) {
      const oldestInWindow = validTimestamps[0] ?? now;
      const retryAfterMs = oldestInWindow + windowMs - now;
      const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

      this.requestTimestamps.set(identifier, validTimestamps);
      return {
        allowed: false,
        remaining: 0,
        retryAfterSeconds,
      };
    }

    validTimestamps.push(now);
    this.requestTimestamps.set(identifier, validTimestamps);

    return {
      allowed: true,
      remaining: limit - validTimestamps.length,
      retryAfterSeconds: 0,
    };
  }

  public reset(identifier?: string): void {
    if (identifier) {
      this.requestTimestamps.delete(identifier);
    } else {
      this.requestTimestamps.clear();
    }
  }
}

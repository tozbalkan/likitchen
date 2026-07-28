import type {
  RateLimiterPort,
  RateLimitDecision,
} from '../../application/resilience/rate-limiter-port';

export class MemoryRateLimiter implements RateLimiterPort {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  async checkLimit(
    scopeKey: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitDecision> {
    const now = Date.now();
    const record = this.hits.get(scopeKey);

    if (!record || now >= record.resetAt) {
      const resetAt = now + windowMs;
      this.hits.set(scopeKey, { count: 1, resetAt });
      return {
        allowed: true,
        remaining: limit - 1,
        resetAt,
        scope: scopeKey,
      };
    }

    if (record.count >= limit) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
        retryAfterMs: record.resetAt - now,
        scope: scopeKey,
      };
    }

    record.count++;
    return {
      allowed: true,
      remaining: limit - record.count,
      resetAt: record.resetAt,
      scope: scopeKey,
    };
  }
}

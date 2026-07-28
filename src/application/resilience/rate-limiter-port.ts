export interface RateLimitDecision {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly resetAt: number;
  readonly retryAfterMs?: number;
  readonly scope: string;
}

export interface RateLimiterPort {
  checkLimit(
    scopeKey: string,
    limit: number,
    windowMs: number,
  ): Promise<RateLimitDecision>;
}

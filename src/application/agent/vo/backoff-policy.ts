export interface BackoffPolicy {
  getDelayMs(attempt: number): number;
}

export class ConstantBackoff implements BackoffPolicy {
  readonly delayMs: number;

  constructor(delayMs: number) {
    if (delayMs < 0) {
      throw new Error('[ConstantBackoff] delayMs cannot be negative.');
    }
    this.delayMs = delayMs;
    Object.freeze(this);
  }

  getDelayMs(_attempt?: number): number {
    return this.delayMs;
  }
}

export class ExponentialBackoff implements BackoffPolicy {
  readonly initialDelayMs: number;
  readonly multiplier: number;
  readonly maxDelayMs: number;

  constructor(initialDelayMs = 100, multiplier = 2, maxDelayMs = 10000) {
    if (initialDelayMs < 0)
      throw new Error(
        '[ExponentialBackoff] initialDelayMs cannot be negative.',
      );
    if (multiplier < 1)
      throw new Error('[ExponentialBackoff] multiplier must be >= 1.');
    if (maxDelayMs < initialDelayMs)
      throw new Error(
        '[ExponentialBackoff] maxDelayMs must be >= initialDelayMs.',
      );

    this.initialDelayMs = initialDelayMs;
    this.multiplier = multiplier;
    this.maxDelayMs = maxDelayMs;
    Object.freeze(this);
  }

  getDelayMs(attempt: number): number {
    if (attempt <= 1) return this.initialDelayMs;
    const delay = this.initialDelayMs * Math.pow(this.multiplier, attempt - 1);
    return Math.min(delay, this.maxDelayMs);
  }
}

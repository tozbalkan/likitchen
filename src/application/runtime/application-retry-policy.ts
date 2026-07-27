export interface RetryOptions {
  readonly maxAttempts: number;
  readonly backoffMs: number;
}

export class ApplicationRetryPolicy {
  constructor(
    private readonly options: RetryOptions = { maxAttempts: 3, backoffMs: 200 },
  ) {}

  async executeWithRetry<T>(
    fn: () => Promise<T>,
    isTransientError: (error: unknown) => boolean,
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.options.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        if (!isTransientError(error) || attempt === this.options.maxAttempts) {
          throw error;
        }
        await new Promise((resolve) =>
          setTimeout(resolve, this.options.backoffMs * attempt),
        );
      }
    }

    throw lastError;
  }
}

export interface RetryContext {
  readonly provider?: string | undefined;
  readonly operation?: string | undefined;
  readonly attempt: number;
  readonly error: unknown;
  readonly responseMetadata?: Readonly<Record<string, string>> | undefined;
}

export interface RetryClassifier {
  isRetryable(context: Readonly<RetryContext>): boolean;
}

export interface BackoffStrategy {
  computeDelayMs(attempt: number): number;
}

export class ExponentialBackoff implements BackoffStrategy {
  constructor(
    private readonly baseMs = 100,
    private readonly maxMs = 5000,
  ) {}

  computeDelayMs(attempt: number): number {
    const delay = this.baseMs * Math.pow(2, attempt - 1);
    return Math.min(delay, this.maxMs);
  }
}

export class RetryPolicy {
  constructor(
    private readonly maxAttempts: number,
    private readonly backoffStrategy: BackoffStrategy,
    private readonly classifier: RetryClassifier,
  ) {}

  async execute<T>(
    fn: () => Promise<T>,
    operationContext?: { provider?: string; operation?: string },
  ): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: unknown) {
        lastError = error;
        const retryContext: RetryContext = {
          provider: operationContext?.provider,
          operation: operationContext?.operation,
          attempt,
          error,
        };

        if (
          !this.classifier.isRetryable(retryContext) ||
          attempt === this.maxAttempts
        ) {
          throw error;
        }

        const delayMs = this.backoffStrategy.computeDelayMs(attempt);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }
}

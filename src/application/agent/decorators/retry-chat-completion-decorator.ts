import type {
  ChatCompletionPort,
  ChatCompletionOptions,
} from '../ports/chat-completion-port';
import type { TenantContext } from '../../identity/tenant-context';
import type { LLMRequest } from '../vo/llm-request';
import type { LLMResponse } from '../vo/llm-response';
import type { RetryPolicy } from '../vo/retry-policy';
import type { DelayPort } from '../../ports/clock/delay-port';

export interface RetryChatCompletionDecoratorConfig {
  readonly inner: Readonly<ChatCompletionPort>;
  readonly retryPolicy: Readonly<RetryPolicy>;
  readonly delayService: Readonly<DelayPort>;
}

export class RetryChatCompletionDecorator implements ChatCompletionPort {
  private readonly inner: Readonly<ChatCompletionPort>;
  private readonly retryPolicy: Readonly<RetryPolicy>;
  private readonly delayService: Readonly<DelayPort>;

  constructor(config: Readonly<RetryChatCompletionDecoratorConfig>) {
    if (!config.inner)
      throw new Error(
        '[RetryChatCompletionDecorator] inner ChatCompletionPort is required.',
      );
    if (!config.retryPolicy)
      throw new Error(
        '[RetryChatCompletionDecorator] RetryPolicy is required.',
      );
    if (!config.delayService)
      throw new Error('[RetryChatCompletionDecorator] DelayPort is required.');

    this.inner = config.inner;
    this.retryPolicy = config.retryPolicy;
    this.delayService = config.delayService;
  }

  async complete(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ChatCompletionOptions>,
  ): Promise<LLMResponse> {
    let attempt = 1;
    let lastError: unknown;

    while (attempt <= this.retryPolicy.maxAttempts) {
      // 1. Check AbortSignal before attempt
      if (options?.signal?.aborted) {
        throw (
          lastError ??
          new Error(
            '[RetryChatCompletionDecorator] Request cancelled prior to attempt.',
          )
        );
      }

      try {
        return await this.inner.complete(tenantContext, request, options);
      } catch (err: unknown) {
        lastError = err;

        // 2. Check if we reached max attempts or error is non-retryable
        if (
          attempt >= this.retryPolicy.maxAttempts ||
          !this.retryPolicy.decisionPolicy.shouldRetry(err, attempt)
        ) {
          throw err;
        }

        // 3. Compute backoff delay
        const delayMs = this.retryPolicy.backoff.getDelayMs(attempt);
        this.onRetry(attempt, err, delayMs);

        // 4. Sleep via DelayPort
        await this.delayService.sleep(delayMs);

        // 5. Re-check AbortSignal after delay before next retry attempt
        if (options?.signal?.aborted) {
          throw err;
        }

        attempt++;
      }
    }

    throw (
      lastError ??
      new Error('[RetryChatCompletionDecorator] Max retry attempts exceeded.')
    );
  }

  protected onRetry(attempt: number, error: unknown, delayMs: number): void {
    // Protected lifecycle hook for future telemetry / logging
    void attempt;
    void error;
    void delayMs;
  }
}

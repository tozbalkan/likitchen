import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../../application/ports/ai/chat-completion-port';
import type { ProviderResult } from '../../application/ports/common/provider-result';
import type { RateLimiterPort } from '../../application/resilience/rate-limiter-port';
import { RateLimitException } from '../providers/common/provider-exception';

export class RateLimiterChatCompletionAdapter implements ChatCompletionPort {
  constructor(
    private readonly target: ChatCompletionPort,
    private readonly rateLimiter: RateLimiterPort,
    private readonly limit = 60,
    private readonly windowMs = 60000,
  ) {}

  async complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>> {
    const decision = await this.rateLimiter.checkLimit(
      'chat_completion_global',
      this.limit,
      this.windowMs,
    );

    if (!decision.allowed) {
      throw new RateLimitException(
        `Rate limit exceeded. Remaining: ${decision.remaining}, Retry after ${decision.retryAfterMs ?? 0}ms`,
        'rate-limiter-adapter',
      );
    }

    return await this.target.complete(request);
  }
}

import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../../application/ports/ai/chat-completion-port';
import type { ProviderResult } from '../../application/ports/common/provider-result';
import type { CircuitBreakerPort } from '../../application/resilience/circuit-breaker-port';

export class CircuitBreakerChatCompletionAdapter implements ChatCompletionPort {
  constructor(
    private readonly target: ChatCompletionPort,
    private readonly breaker: CircuitBreakerPort,
  ) {}

  async complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>> {
    return await this.breaker.execute(async () => {
      return await this.target.complete(request);
    });
  }
}

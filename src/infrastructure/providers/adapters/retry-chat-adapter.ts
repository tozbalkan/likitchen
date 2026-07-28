import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../../../application/ports/ai/chat-completion-port';
import type { ProviderResult } from '../../../application/ports/common/provider-result';
import type { ApplicationRetryPolicy } from '../../../application/runtime/application-retry-policy';
import type { ProviderException } from '../common/provider-exception';

export class RetryChatCompletionAdapter implements ChatCompletionPort {
  constructor(
    private readonly target: ChatCompletionPort,
    private readonly retryPolicy: ApplicationRetryPolicy,
  ) {}

  async complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>> {
    return await this.retryPolicy.executeWithRetry(
      async () => await this.target.complete(request),
      (error: unknown) => {
        const exception = error as ProviderException;
        return Boolean(
          exception && 'isTransient' in exception && exception.isTransient,
        );
      },
    );
  }
}

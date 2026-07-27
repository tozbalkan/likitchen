import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../../../application/ports/ai/chat-completion-port';
import type { ProviderResult } from '../common/provider-result';
import type { ProviderException } from '../common/provider-exception';

export class FallbackChatCompletionAdapter implements ChatCompletionPort {
  constructor(private readonly providers: readonly ChatCompletionPort[]) {
    if (providers.length === 0) {
      throw new Error(
        'FallbackChatCompletionAdapter requires at least one provider.',
      );
    }
  }

  async complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>> {
    let lastError: unknown;

    for (const provider of this.providers) {
      try {
        return await provider.complete(request);
      } catch (error: unknown) {
        lastError = error;
        const exception = error as ProviderException;
        if (exception && 'isTransient' in exception && !exception.isTransient) {
          // Permanent error, do not fallback
          throw error;
        }
      }
    }

    throw lastError;
  }
}

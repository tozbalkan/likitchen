import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../../../application/ports/ai/chat-completion-port';
import type { ProviderResult } from '../common/provider-result';

export class FakeChatCompletionAdapter implements ChatCompletionPort {
  private readonly providerId = 'fake-provider';

  constructor(
    private readonly cannedResponse = 'This is a deterministic fake response.',
  ) {}

  async complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>> {
    return {
      value: this.cannedResponse,
      rawResponse: this.cannedResponse,
      metadata: {
        providerId: this.providerId,
        model: 'fake-v1',
        promptFingerprint: request.promptFingerprint,
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
      },
    };
  }
}

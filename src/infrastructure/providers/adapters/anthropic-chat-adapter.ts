import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../../../application/ports/ai/chat-completion-port';
import type { ProviderResult } from '../common/provider-result';

export class AnthropicChatAdapter implements ChatCompletionPort {
  readonly providerId = 'anthropic';

  constructor(
    private readonly apiKey = 'mock-key',
    private readonly model = 'claude-3-5-sonnet',
  ) {}

  async complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>> {
    const responseText = `Claude (${this.model}) response for: ${request.userMessage}`;

    return {
      value: responseText,
      rawResponse: JSON.stringify({ content: responseText }),
      metadata: {
        providerId: this.providerId,
        model: this.model,
        promptFingerprint: request.promptFingerprint,
        usage: { promptTokens: 40, completionTokens: 20, totalTokens: 60 },
      },
    };
  }
}

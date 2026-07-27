import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../../../application/ports/ai/chat-completion-port';
import type { ProviderResult } from '../common/provider-result';
import { TimeoutException } from '../common/provider-exception';

export class OpenAiChatAdapter implements ChatCompletionPort {
  readonly providerId = 'openai';

  constructor(
    private readonly apiKey = 'mock-key',
    private readonly model = 'gpt-4o',
  ) {}

  async complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>> {
    if (this.apiKey === 'trigger-timeout') {
      throw new TimeoutException(
        'OpenAI API request timed out.',
        this.providerId,
      );
    }

    const responseText = `OpenAI (${this.model}) response for: ${request.userMessage}`;

    return {
      value: responseText,
      rawResponse: JSON.stringify({ choice: responseText }),
      metadata: {
        providerId: this.providerId,
        model: this.model,
        promptFingerprint: request.promptFingerprint,
        usage: { promptTokens: 50, completionTokens: 25, totalTokens: 75 },
      },
    };
  }
}

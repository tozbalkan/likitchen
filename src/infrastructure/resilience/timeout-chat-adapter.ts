import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../../application/ports/ai/chat-completion-port';
import type { ProviderResult } from '../../application/ports/common/provider-result';
import { TimeoutException } from '../providers/common/provider-exception';

export class TimeoutChatCompletionAdapter implements ChatCompletionPort {
  constructor(
    private readonly target: ChatCompletionPort,
    private readonly timeoutMs = 5000,
  ) {}

  async complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>> {
    let timer: NodeJS.Timeout | undefined;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new TimeoutException(
            `ChatCompletion call exceeded per-attempt timeout of ${this.timeoutMs}ms`,
            'timeout-adapter',
          ),
        );
      }, this.timeoutMs);
    });

    try {
      return await Promise.race([
        this.target.complete(request),
        timeoutPromise,
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

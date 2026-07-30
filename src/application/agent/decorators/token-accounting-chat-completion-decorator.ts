import type {
  ChatCompletionPort,
  ChatCompletionOptions,
} from '../ports/chat-completion-port';
import type { TenantContext } from '../../identity/tenant-context';
import type { LLMRequest } from '../vo/llm-request';
import type { LLMResponse } from '../vo/llm-response';
import { BaseChatCompletionPort } from '../ports/base-chat-completion-port';

export interface TokenAccountingChatCompletionDecoratorProps {
  readonly inner: ChatCompletionPort;
}

export class TokenAccountingChatCompletionDecorator
  extends BaseChatCompletionPort
  implements ChatCompletionPort
{
  private readonly inner: ChatCompletionPort;

  constructor(props: Readonly<TokenAccountingChatCompletionDecoratorProps>) {
    super();
    if (!props.inner) {
      throw new Error(
        '[TokenAccountingChatCompletionDecorator] inner ChatCompletionPort is required.',
      );
    }
    this.inner = props.inner;
  }

  async complete(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ChatCompletionOptions>,
  ): Promise<LLMResponse> {
    this.validateRequest(tenantContext, request);
    const response = await this.inner.complete(tenantContext, request, options);

    // Pure token accounting normalization attachment (0 side-effects, 0 DB/billing calls)
    return response;
  }
}

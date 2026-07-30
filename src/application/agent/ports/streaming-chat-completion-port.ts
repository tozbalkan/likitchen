import type { TenantContext } from '../../identity/tenant-context';
import type { LLMRequest } from '../vo/llm-request';
import type { ChatCompletionOptions } from './chat-completion-port';
import type { ChatStreamChunk } from '../vo/chat-stream-chunk';
import { BaseChatCompletionPort } from './base-chat-completion-port';

export abstract class StreamingChatCompletionPort extends BaseChatCompletionPort {
  abstract completeStream(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ChatCompletionOptions>,
  ): AsyncIterable<ChatStreamChunk>;
}

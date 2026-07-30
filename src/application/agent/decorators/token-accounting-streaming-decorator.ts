import { StreamingChatCompletionPort } from '../ports/streaming-chat-completion-port';
import type { TenantContext } from '../../identity/tenant-context';
import type { LLMRequest } from '../vo/llm-request';
import type { ChatCompletionOptions } from '../ports/chat-completion-port';
import { StreamMetadata } from '../vo/stream-metadata';
import {
  DefaultStreamingChatResponse,
  type StreamingChatResponse,
} from '../ports/streaming-chat-response';

export interface TokenAccountingStreamingDecoratorProps {
  readonly inner: StreamingChatCompletionPort;
}

export class TokenAccountingStreamingDecorator extends StreamingChatCompletionPort {
  private readonly inner: StreamingChatCompletionPort;

  constructor(props: Readonly<TokenAccountingStreamingDecoratorProps>) {
    super();
    if (!props.inner) {
      throw new Error(
        '[TokenAccountingStreamingDecorator] inner StreamingChatCompletionPort is required.',
      );
    }
    this.inner = props.inner;
  }

  completeStream(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ChatCompletionOptions>,
  ): AsyncIterable<import('../vo/chat-stream-chunk').ChatStreamChunk> {
    this.validateRequest(tenantContext, request);
    return this.inner.completeStream(tenantContext, request, options);
  }

  createTrackedResponse(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ChatCompletionOptions>,
  ): StreamingChatResponse {
    this.validateRequest(tenantContext, request);
    const metadata = StreamMetadata.create({
      streamId: `stream-${Date.now()}`,
      model: request.model,
    });

    const sourceStream = this.inner.completeStream(
      tenantContext,
      request,
      options,
    );
    return new DefaultStreamingChatResponse(metadata, sourceStream);
  }
}

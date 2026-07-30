import { StreamingChatCompletionPort } from '../../application/agent/ports/streaming-chat-completion-port';
import type { TenantContext } from '../../application/identity/tenant-context';
import type { LLMRequest } from '../../application/agent/vo/llm-request';
import type { ChatCompletionOptions } from '../../application/agent/ports/chat-completion-port';
import {
  createTextDeltaChunk,
  createToolCallDeltaChunk,
  createFinishChunk,
  type ChatStreamChunk,
  type StreamFinishReason,
} from '../../application/agent/vo/chat-stream-chunk';
import type { ToolId } from '../../application/agent/vo/tool-definition';

export interface OpenAiStreamingChatAdapterConfig {
  readonly apiKey?: string | undefined;
  readonly baseUrl?: string | undefined;
}

export class OpenAiStreamingChatAdapter extends StreamingChatCompletionPort {
  private readonly apiKey: string;
  private readonly baseUrl: string;

  constructor(config: Readonly<OpenAiStreamingChatAdapterConfig> = {}) {
    super();
    this.apiKey = config.apiKey ?? 'mock-key';
    this.baseUrl = config.baseUrl ?? 'https://api.openai.com/v1';
  }

  async *completeStream(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ChatCompletionOptions>,
  ): AsyncIterable<ChatStreamChunk> {
    // 1. Shared request validation
    this.validateRequest(tenantContext, request);

    // 2. Check AbortSignal prior to stream initiation
    if (options?.signal?.aborted) {
      return;
    }

    let chunkIndex = 0;
    const streamId = `stream-openai-${Date.now()}`;

    // Simulated / mock SSE event generator for Infrastructure Layer
    const mockSseChunks = this.generateMockSseEvents(request);

    for (const sseChunk of mockSseChunks) {
      // Check AbortSignal between chunks
      if (options?.signal?.aborted) {
        break;
      }

      if (sseChunk.text) {
        yield createTextDeltaChunk(
          `${streamId}-${chunkIndex}`,
          chunkIndex,
          sseChunk.text,
        );
        chunkIndex++;
      } else if (sseChunk.toolCall) {
        yield createToolCallDeltaChunk(
          `${streamId}-${chunkIndex}`,
          chunkIndex,
          sseChunk.toolCall.callId,
          sseChunk.toolCall.toolId as ToolId,
          sseChunk.toolCall.argumentsDelta,
        );
        chunkIndex++;
      } else if (sseChunk.finishReason) {
        const normalizedReason = this.normalizeFinishReason(
          sseChunk.finishReason,
        );
        yield createFinishChunk(
          `${streamId}-${chunkIndex}`,
          chunkIndex,
          normalizedReason,
        );
        chunkIndex++;
        break;
      }
    }
  }

  private normalizeFinishReason(rawReason: string): StreamFinishReason {
    switch (rawReason) {
      case 'stop':
        return 'STOP';
      case 'tool_calls':
      case 'tool_call':
        return 'TOOL_CALL';
      case 'length':
        return 'LENGTH';
      case 'content_filter':
        return 'CONTENT_FILTER';
      default:
        return 'STOP';
    }
  }

  private generateMockSseEvents(request: Readonly<LLMRequest>): Array<{
    text?: string;
    toolCall?: { callId: string; toolId: string; argumentsDelta: string };
    finishReason?: string;
  }> {
    const lastMsg = request.messages[request.messages.length - 1];
    const textContent = lastMsg?.textContent ?? '';

    if (
      textContent.toLowerCase().includes('weather') ||
      textContent.toLowerCase().includes('calc')
    ) {
      return [
        {
          toolCall: {
            callId: 'call-101',
            toolId: 'tool-weather',
            argumentsDelta: '{"city":',
          },
        },
        {
          toolCall: {
            callId: 'call-101',
            toolId: 'tool-weather',
            argumentsDelta: '"Tokyo"}',
          },
        },
        { finishReason: 'tool_calls' },
      ];
    }

    return [
      { text: 'Hello! ' },
      { text: 'How can I help you today?' },
      { finishReason: 'stop' },
    ];
  }
}

import type { StreamMetadata } from '../vo/stream-metadata';
import type { ChatStreamChunk } from '../vo/chat-stream-chunk';
import type { UsageBreakdown } from '../vo/usage-breakdown';

export type StreamingUsageStatus =
  'PENDING' | 'AVAILABLE' | 'UNAVAILABLE' | 'CANCELLED' | 'FAILED';

export interface StreamingChatResponse {
  readonly metadata: StreamMetadata;
  readonly stream: AsyncIterable<ChatStreamChunk>;
  getUsage(): Promise<UsageBreakdown | undefined>;
  getUsageStatus(): StreamingUsageStatus;
}

export class DefaultStreamingChatResponse implements StreamingChatResponse {
  readonly metadata: StreamMetadata;
  readonly stream: AsyncIterable<ChatStreamChunk>;
  private status: StreamingUsageStatus = 'PENDING';
  private resolvedUsage: UsageBreakdown | undefined = undefined;
  private rejectionError: Error | undefined = undefined;
  private readonly usagePromise: Promise<UsageBreakdown | undefined>;
  private resolveUsageFn!: (value: UsageBreakdown | undefined) => void;
  private rejectUsageFn!: (reason: Error) => void;

  constructor(
    metadata: Readonly<StreamMetadata>,
    sourceStream: AsyncIterable<ChatStreamChunk>,
  ) {
    this.metadata = metadata;

    this.usagePromise = new Promise<UsageBreakdown | undefined>(
      (resolve, reject) => {
        this.resolveUsageFn = resolve;
        this.rejectUsageFn = reject;
      },
    );

    this.stream = this.wrapStream(sourceStream);
  }

  getUsageStatus(): StreamingUsageStatus {
    return this.status;
  }

  async getUsage(): Promise<UsageBreakdown | undefined> {
    return this.usagePromise;
  }

  private async *wrapStream(
    source: AsyncIterable<ChatStreamChunk>,
  ): AsyncIterable<ChatStreamChunk> {
    try {
      for await (const chunk of source) {
        if (chunk.type === 'finish') {
          if (chunk.usage) {
            this.status = 'AVAILABLE';
            this.resolvedUsage = chunk.usage;
            this.resolveUsageFn(chunk.usage);
          } else {
            this.status = 'UNAVAILABLE';
            this.resolveUsageFn(undefined);
          }
        }
        yield chunk;
      }

      // Stream loop finished without a terminal finish chunk carrying usage
      if (this.status === 'PENDING') {
        this.status = 'UNAVAILABLE';
        this.resolveUsageFn(undefined);
      }
    } catch (err: unknown) {
      this.status = 'FAILED';
      const errorObj = err instanceof Error ? err : new Error(String(err));
      this.rejectionError = errorObj;
      this.rejectUsageFn(errorObj);
      throw err;
    } finally {
      // Early consumer break or cancellation while still PENDING
      if (this.status === 'PENDING') {
        this.status = 'CANCELLED';
        this.resolveUsageFn(undefined);
      }
    }
  }
}

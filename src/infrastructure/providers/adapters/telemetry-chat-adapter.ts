import type {
  ChatCompletionPort,
  ChatCompletionRequest,
} from '../../../application/ports/ai/chat-completion-port';
import type { ProviderResult } from '../../../application/ports/common/provider-result';
import type { TelemetryPort } from '../../../application/telemetry/telemetry-port';
import { ExecutionContext } from '../../../application/context/execution-context';

export class TelemetryChatCompletionAdapter implements ChatCompletionPort {
  constructor(
    private readonly target: ChatCompletionPort,
    private readonly telemetryPort: TelemetryPort,
  ) {}

  async complete(
    request: Readonly<ChatCompletionRequest>,
  ): Promise<ProviderResult<string>> {
    const context = ExecutionContext.create({
      correlationId: `corr-${Date.now()}`,
      traceId: `trace-${Date.now()}`,
    });

    return await this.telemetryPort.withSpan(
      context,
      {
        name: 'ai.chat_completion',
        attributes: {
          promptFingerprint: request.promptFingerprint,
        },
      },
      async () => {
        const startTime = Date.now();
        try {
          const result = await this.target.complete(request);
          const duration = Date.now() - startTime;

          this.telemetryPort.histogram(context, {
            name: 'ai.chat_completion.duration_ms',
            value: duration,
            attributes: {
              providerId: result.metadata.providerId,
              model: result.metadata.model,
            },
          });

          this.telemetryPort.counter(context, {
            name: 'ai.chat_completion.success',
            value: 1,
            attributes: { providerId: result.metadata.providerId },
          });

          return result;
        } catch (error) {
          this.telemetryPort.counter(context, {
            name: 'ai.chat_completion.failure',
            value: 1,
          });
          throw error;
        }
      },
    );
  }
}

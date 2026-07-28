import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from '../execution-stage';
import type { ChatCompletionPort } from '../../ports/ai/chat-completion-port';

export class DispatchStage implements ExecutionStage {
  readonly name = 'DispatchStage';

  constructor(private readonly chatCompletionPort: ChatCompletionPort) {}

  async execute(context: Readonly<StageContext>): Promise<StageResult> {
    context.cancellationToken.throwIfCancelled();

    const result = await this.chatCompletionPort.complete({
      systemPrompt: context.systemPrompt ?? 'Default system prompt',
      userMessage: context.userMessage ?? '',
      promptFingerprint: context.plan?.promptReference ?? 'fp-default',
    });

    const updatedContext = context.copy({
      rawProviderResult: result,
    });

    return {
      status: 'CONTINUE',
      context: updatedContext,
      metadata: {
        providerId: result.metadata.providerId,
        model: result.metadata.model,
      },
    };
  }
}

import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from '../execution-stage';
import type { PromptResolverPort } from '../ports/prompt-resolver-port';

export class PromptStage implements ExecutionStage {
  readonly name = 'PromptStage';

  constructor(private readonly promptResolver: PromptResolverPort) {}

  async execute(context: Readonly<StageContext>): Promise<StageResult> {
    context.cancellationToken.throwIfCancelled();

    const reference =
      context.plan?.promptReference ?? 'default_prompt_template';
    const resolution = await this.promptResolver.resolvePrompt(
      reference,
      context.metadata ?? {},
    );

    const updatedContext = context.copy({
      systemPrompt: resolution.systemPrompt,
      userMessage: context.userMessage ?? resolution.userMessage,
      prompt: `${resolution.systemPrompt}\n${context.userMessage ?? resolution.userMessage}`,
    });

    return {
      status: 'CONTINUE',
      context: updatedContext,
      metadata: { promptReference: resolution.resolvedPromptReference },
    };
  }
}

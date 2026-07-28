import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from '../execution-stage';
import type { ConversationMemoryPort } from '../ports/conversation-memory-port';
import type { MemoryPolicy } from '../policies/memory-policy';

export class MemoryStage implements ExecutionStage {
  readonly name = 'MemoryStage';

  constructor(
    private readonly conversationMemory: ConversationMemoryPort,
    private readonly memoryPolicy?: MemoryPolicy,
  ) {}

  async execute(context: Readonly<StageContext>): Promise<StageResult> {
    context.cancellationToken.throwIfCancelled();

    const limit = this.memoryPolicy?.historyLimit ?? 10;
    const history = await this.conversationMemory.getHistory(
      context.tenantContext,
      context.executionContext.correlationId,
      limit,
    );

    const historyFormatted = history
      .map((h) => `${h.role.toUpperCase()}: ${h.content}`)
      .join('\n');

    const updatedPrompt = historyFormatted
      ? `${context.systemPrompt ?? ''}\n\n[CONVERSATION HISTORY]\n${historyFormatted}\n\n[USER MESSAGE]\n${context.userMessage ?? ''}`
      : context.prompt;

    const updatedContext = context.copy({
      prompt: updatedPrompt,
      memoryData: { historyCount: history.length },
    });

    return {
      status: 'CONTINUE',
      context: updatedContext,
      metadata: { historyCount: history.length },
    };
  }
}

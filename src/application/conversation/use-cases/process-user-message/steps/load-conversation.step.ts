import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import { ConflictFailure } from '../../../../../shared/errors/conflict';
import type { ConversationStore } from '../../../ports/conversation-store';
import { Conversation } from '../../../../../domain/conversation/entities/conversation';

export class LoadConversationStep implements PipelineStep {
  constructor(private readonly store: ConversationStore) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    const result = await this.store.findById(context.conversationId);
    let conversation: Conversation;

    if (!result.ok) {
      if (result.error.code === 'NOT_FOUND') {
        // First message lifecycle: initialize new conversation entity
        conversation = Conversation.start(context.conversationId);
      } else {
        return err(result.error);
      }
    } else {
      conversation = result.value;
    }

    // Check invariant: Conversation must be active
    if (!conversation.isActive()) {
      return err(
        new ConflictFailure(
          `Conversation ${context.conversationId} is not active.`,
        ),
      );
    }

    return ok({
      ...context,
      conversation,
    });
  }
}

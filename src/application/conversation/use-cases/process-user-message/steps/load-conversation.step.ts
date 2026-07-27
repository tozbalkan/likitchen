import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import { ConflictFailure } from '../../../../../shared/errors/conflict';
import type { ConversationStore } from '../../../ports/conversation-store';

export class LoadConversationStep implements PipelineStep {
  constructor(private readonly store: ConversationStore) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    const result = await this.store.findById(context.conversationId);
    if (!result.ok) {
      return err(result.error);
    }

    const conversation = result.value;

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

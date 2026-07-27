import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import type { ConversationUnitOfWork } from '../../../ports/conversation-uow';

export class PersistStep implements PipelineStep {
  constructor(private readonly uow: ConversationUnitOfWork) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    if (!context.conversation) {
      return err({
        code: 'MissingStateError',
        message: 'conversation is missing from context.',
      });
    }

    if (context.mergeResult && !context.mergeResult.hasChanges) {
      // Fast path: no state changes require persistence
      // However, we still need to mark as processed idempotently
      if (context.processContext.idempotencyKey) {
        try {
          await this.uow.execute(context.processContext, async (stores) => {
            if (context.processContext.idempotencyKey) {
              await stores.idempotency.markProcessed(
                context.processContext.idempotencyKey,
              );
            }
          });
        } catch (e: unknown) {
          return err({
            code: 'PersistenceError',
            message: (e as Error).message,
          });
        }
      }
      return ok(context);
    }

    try {
      await this.uow.execute(context.processContext, async (stores) => {
        // Save the aggregate
        const saveResult = await stores.conversation.save(
          context.conversation!,
          context.expectedRevision,
        );
        if (!saveResult.ok) {
          throw saveResult.error;
        }

        // Mark processed
        if (context.processContext.idempotencyKey) {
          await stores.idempotency.markProcessed(
            context.processContext.idempotencyKey,
          );
        }
      });
    } catch (e: unknown) {
      if ((e as Error & { code?: string }).code)
        return err(e as ApplicationError);
      return err({ code: 'PersistenceError', message: (e as Error).message });
    }

    return ok(context);
  }
}

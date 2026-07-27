import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import type { IdempotencyStore } from '../../../ports/idempotency-store';
import { ConflictFailure } from '../../../../../shared/errors/conflict';

export class IdempotencyStep implements PipelineStep {
  constructor(private readonly idempotencyStore: IdempotencyStore) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    if (!context.processContext.idempotencyKey) {
      return ok(context); // Skip if no key provided
    }

    const isProcessed = await this.idempotencyStore.isProcessed(
      context.processContext.idempotencyKey,
    );

    if (isProcessed) {
      return err(
        new ConflictFailure(
          `Message with idempotency key ${context.processContext.idempotencyKey} was already processed.`,
        ),
      );
    }

    return ok(context);
  }
}

import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import { ConflictFailure } from '../../../../../shared/errors/conflict';
import type { Clock } from '../../../../ports/clock';
import type { Uuid } from '../../../../../shared/types';

export class ApplyFactsStep implements PipelineStep {
  constructor(
    private readonly clock: Clock,
    private readonly uuidGenerator: { generate(): Uuid },
  ) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    if (
      !context.conversation ||
      !context.mergeResult ||
      !context.assessmentSnapshot
    ) {
      return err({
        code: 'MissingStateError',
        message: 'conversation, mergeResult, or assessmentSnapshot is missing.',
      });
    }

    if (!context.mergeResult.hasChanges) {
      return ok(context); // Nothing to apply
    }

    const outcome = context.conversation.applyFacts(
      context.mergeResult.facts,
      context.assessmentSnapshot,
      context.processContext.correlationId, // source
      this.uuidGenerator.generate(),
      this.clock.now(),
    );

    if (!outcome.success) {
      return err(
        new ConflictFailure(
          outcome.error ?? 'Failed to apply facts to aggregate.',
        ),
      );
    }

    return ok(context);
  }
}

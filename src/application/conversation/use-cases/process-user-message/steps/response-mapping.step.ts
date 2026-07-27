import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';

export class ResponseMappingStep implements PipelineStep {
  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    if (!context.conversation || !context.assessmentSnapshot) {
      return err({
        code: 'MissingStateError',
        message: 'conversation or assessmentSnapshot is missing.',
      });
    }

    const response = {
      conversationId: context.conversationId,
      revision: context.conversation.revision,
      assessment: context.assessmentSnapshot,
      nextAction: context.assessmentSnapshot.recommendation,
    };

    return ok({
      ...context,
      response,
    });
  }
}

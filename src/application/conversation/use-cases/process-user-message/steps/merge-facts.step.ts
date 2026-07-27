import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import type { ConversationMergerStrategy } from '../../../../../domain/conversation/pipeline/conversation-merger';

export class MergeFactsStep implements PipelineStep {
  constructor(private readonly merger: ConversationMergerStrategy) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    if (!context.conversation || !context.parsedFacts) {
      return err({
        code: 'MissingStateError',
        message: 'conversation or parsedFacts is missing from context.',
      });
    }

    const existingFacts = context.conversation.facts;
    const mergeResult = this.merger.merge(existingFacts, context.parsedFacts);

    return ok({
      ...context,
      mergeResult,
    });
  }
}

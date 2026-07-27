import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import type { ConversationParser } from '../parser';

export class ParsingStep implements PipelineStep {
  constructor(private readonly parser: ConversationParser) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    if (!context.rawAiResponse || !context.validatedContract) {
      return err({
        code: 'MissingStateError',
        message: 'rawAiResponse or validatedContract is missing from context.',
      });
    }

    const result = this.parser.parse(
      context.validatedContract.schema_version,
      context.validatedContract,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      ...context,
      parsedFacts: result.value,
    });
  }
}

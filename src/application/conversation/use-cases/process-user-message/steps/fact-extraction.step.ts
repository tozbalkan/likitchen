import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import type { FactExtractionPort } from '../../../ports/fact-extraction-port';
import type { PromptBuilder } from '../../../../ai/prompt-builder';

export class FactExtractionStep implements PipelineStep {
  constructor(
    private readonly extractionPort: FactExtractionPort,
    private readonly promptBuilder: PromptBuilder,
  ) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    // 1. Build the prompt using the existing conversation history
    const history: readonly unknown[] = []; // TODO: Implement reading history from store or conversation
    const promptPackage = this.promptBuilder.build(history, context.message);

    // 2. Extract facts using the built prompt
    const result = await this.extractionPort.extractFacts(
      context.message,
      promptPackage,
      context.processContext,
    );

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      ...context,
      promptPackage,
      rawAiResponse: result.value,
    });
  }
}

import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import { safeParseAiOutput } from '../../../../ai/contracts/ai-output-schema';
import { TransportNormalizer } from '../../../../ai/normalization/transport-normalizer';

export class ValidationStep implements PipelineStep {
  constructor(private readonly transportNormalizer: TransportNormalizer) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    if (!context.rawAiResponse) {
      return err({
        code: 'MissingStateError',
        message: 'rawAiResponse is missing from context.',
      });
    }

    // 1. Normalize the raw string
    const normalizedResult = this.transportNormalizer.normalize(
      context.rawAiResponse.content,
    );
    if (!normalizedResult.ok) {
      return err(normalizedResult.error);
    }

    // 2. Parse JSON
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(normalizedResult.value);
    } catch (e: unknown) {
      return err({
        code: 'TransportNormalizationError',
        message: `Failed to parse normalized JSON: ${(e as Error).message}`,
      });
    }

    // 3. Use Zod to validate the contract matches the AiOutputSchema
    const result = safeParseAiOutput(parsedJson);

    if (!result.ok) {
      return err(result.error);
    }

    return ok({
      ...context,
      validatedContract: result.value,
    });
  }
}

import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from '../execution-stage';
import type { StructuredOutputValidatorPort } from '../ports/structured-output-validator-port';

export class ValidationStage implements ExecutionStage {
  readonly name = 'ValidationStage';

  constructor(private readonly validator: StructuredOutputValidatorPort) {}

  async execute(context: Readonly<StageContext>): Promise<StageResult> {
    context.cancellationToken.throwIfCancelled();

    const schema = context.metadata?.['outputSchema'] as
      Record<string, unknown> | undefined;
    const rawOutput = context.rawProviderResult?.value;

    if (!schema || !rawOutput) {
      const updatedContext = context.copy({
        isOutputValid: true,
        validatedOutput: rawOutput,
      });
      return {
        status: 'CONTINUE',
        context: updatedContext,
        metadata: { validationSkipped: true },
      };
    }

    const validationResult = await this.validator.validate(rawOutput, schema);

    const updatedContext = context.copy({
      isOutputValid: validationResult.valid,
      validatedOutput: validationResult.parsedData ?? rawOutput,
      validationErrors: validationResult.errors,
    });

    return {
      status: 'CONTINUE',
      context: updatedContext,
      metadata: {
        valid: validationResult.valid,
        errorCount: validationResult.errors?.length ?? 0,
      },
    };
  }
}

import { z } from 'zod';
import type { ReadonlyDeep } from 'type-fest';
import { AI_OUTPUT_SCHEMA_VERSION } from '../../../shared/contracts/versions';
import {
  createValidationResult,
  createSuccessResult,
} from '../../../shared/contracts/result';
import { Result } from '../../../shared/result';
import { ValidationFailure } from '../../../shared/errors';
import { ExtractedFactsSchema } from '../../conversation/contracts';

export const AiOutputSchema = z
  .object({
    schema_version: z.literal(AI_OUTPUT_SCHEMA_VERSION),
    extractedFacts: ExtractedFactsSchema,
    confidence: z.number(),
    missingInformation: z.array(z.string()),
    suggestedFollowup: z.string().nullable(),
    notes: z.string(),
  })
  .strict();

export type AiOutput = ReadonlyDeep<z.infer<typeof AiOutputSchema>>;

export function parseAiOutput(input: unknown): AiOutput {
  return AiOutputSchema.parse(input) as AiOutput;
}

export function safeParseAiOutput(
  input: unknown,
): Result<AiOutput, ValidationFailure> {
  const result = AiOutputSchema.safeParse(input);
  if (result.success) {
    return createSuccessResult(result.data as AiOutput);
  }
  return createValidationResult(result.error);
}

export function isAiOutput(input: unknown): input is AiOutput {
  return AiOutputSchema.safeParse(input).success;
}

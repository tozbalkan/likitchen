import { z } from 'zod';

export const ExtractedFactsZodSchema = z
  .object({
    project_type: z.string().optional(),
    location: z.string().optional(),
    budget_range: z.string().optional(),
    timeline: z.string().optional(),
    materials: z.array(z.string()).optional(),
    raw_notes: z.string().optional(),
  })
  .strict();

export type ExtractedFactsPayload = z.infer<typeof ExtractedFactsZodSchema>;

export const FORBIDDEN_FIELDS = [
  'readiness',
  'score',
  'recommendation',
  'priority',
  'qualification',
  'sales_status',
] as const;

export function validateNoForbiddenFields(
  rawJsonObject: Record<string, unknown>,
): void {
  for (const forbiddenKey of FORBIDDEN_FIELDS) {
    if (forbiddenKey in rawJsonObject) {
      throw new Error(
        `[ExtractedFactsZodSchema] Security violation: Forbidden field '${forbiddenKey}' detected in LLM extraction payload.`,
      );
    }
  }
}

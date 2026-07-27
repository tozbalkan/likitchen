import { z } from 'zod';
import type { ReadonlyDeep } from 'type-fest';
import { WORKSPACE_SCHEMA_VERSION } from '../../shared/contracts/versions';
import {
  createValidationResult,
  createSuccessResult,
} from '../../shared/contracts/result';
import { Result } from '../../shared/result';
import { ValidationFailure } from '../../shared/errors';
import {
  ConversationStatusSchema,
  ConversationFactsSchema,
} from '../conversation/contracts';
import { TimelineSchema } from '../conversation/contracts';

export const WorkspaceSchema = z
  .object({
    schema_version: z.literal(WORKSPACE_SCHEMA_VERSION),
    conversation: z.string(), // Full transcript
    summary: z.string().optional(),
    facts: ConversationFactsSchema,
    readiness: z.number().nullable(),
    confidence: z.number(),
    recommendation: z.enum([
      'ask_followup',
      'route_to_human',
      'low_priority',
      'out_of_service_area',
    ]),
    status: ConversationStatusSchema,
    timeline: TimelineSchema.optional(),
    photos: z.array(z.string().url()),
    source: z.string(),
    campaign: z.string().optional(),
    assignedUser: z.string().optional(),
    notes: z.string().optional(),
  })
  .strict();

export type Workspace = ReadonlyDeep<z.infer<typeof WorkspaceSchema>>;

export function parseWorkspace(input: unknown): Workspace {
  return WorkspaceSchema.parse(input) as Workspace;
}

export function safeParseWorkspace(
  input: unknown,
): Result<Workspace, ValidationFailure> {
  const result = WorkspaceSchema.safeParse(input);
  if (result.success) {
    return createSuccessResult(result.data as Workspace);
  }
  return createValidationResult(result.error);
}

export function isWorkspace(input: unknown): input is Workspace {
  return WorkspaceSchema.safeParse(input).success;
}

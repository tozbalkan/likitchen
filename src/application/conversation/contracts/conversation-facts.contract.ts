import { z, type ZodType } from 'zod';
import { ServiceAreaStatusSchema } from './location.contract';
import type {
  ConversationStatus,
  ConversationState,
  ProjectType,
  BudgetRange,
  Timeline,
  Language,
  AttachmentType,
  Attachment,
  ExtractedFacts,
  ResolvedFacts,
  ConversationFacts,
} from '../../../domain/conversation/conversation-facts';

export const ConversationStatusSchema: ZodType<ConversationStatus> = z.enum([
  'open',
  'qualified',
  'consultation',
  'estimate',
  'won',
  'lost',
]);

export const ConversationStateSchema: ZodType<ConversationState> = z
  .object({
    conversation_id: z.string(),
    stage: z.string(),
    followup_count: z.number().default(0),
    last_question: z.string().optional(),
    last_message_id: z.string().optional(),
    status: ConversationStatusSchema.default('open'),
  })
  .strict();

export const ProjectTypeSchema: ZodType<ProjectType> = z.enum([
  'full_kitchen_remodel',
  'cabinets_only',
  'countertops_only',
  'bathroom_remodel',
  'other',
]);

export const BudgetRangeSchema: ZodType<BudgetRange> = z.enum([
  'under_15k',
  '15k_30k',
  '30k_60k',
  '60k_plus',
  'not_sure',
]);

export const TimelineSchema: ZodType<Timeline> = z.enum([
  'asap',
  '1_3_months',
  '3_6_months',
  'unsure',
]);

export const LanguageSchema: ZodType<Language> = z.enum([
  'en',
  'es',
  'tr',
  'other',
]);

export const AttachmentTypeSchema: ZodType<AttachmentType> = z.enum([
  'image',
  'pdf',
  'video',
]);

export const AttachmentSchema: ZodType<Attachment> = z
  .object({
    id: z.string(),
    type: AttachmentTypeSchema,
    url: z.string().url(),
    caption: z.string().optional(),
  })
  .strict();

export const ExtractedFactsSchema: ZodType<ExtractedFacts> = z
  .object({
    schema_version: z.number().default(1),
    project_type: ProjectTypeSchema.optional(),
    location_raw: z.string().min(2).optional(),
    budget_range: BudgetRangeSchema.optional(),
    timeline: TimelineSchema.optional(),
    attachments: z.array(AttachmentSchema).default([]),
    is_homeowner: z.boolean().optional(),
    detected_language: LanguageSchema.optional(),
    preferred_language: LanguageSchema.optional(),
    conversation_summary: z.string().optional(),
  })
  .strict();

export const ResolvedFactsSchema: ZodType<ResolvedFacts> = z
  .object({
    town: z.string().optional(),
    county: z.string().optional(),
    service_area_status: ServiceAreaStatusSchema,
  })
  .strict();

export const ConversationFactsSchema: ZodType<ConversationFacts> =
  z.intersection(
    ExtractedFactsSchema as never,
    (ResolvedFactsSchema as never as z.ZodObject<z.ZodRawShape>).partial(),
  );

import { Result } from '../../../shared/result';
import { ValidationFailure } from '../../../shared/errors';
import {
  createValidationResult,
  createSuccessResult,
} from '../../../shared/contracts/result';

export function safeParseConversationFacts(
  input: unknown,
): Result<ConversationFacts, ValidationFailure> {
  const result = ConversationFactsSchema.safeParse(input);
  if (result.success) {
    return createSuccessResult(result.data);
  }
  return createValidationResult(result.error);
}

export function isConversationFacts(
  input: unknown,
): input is ConversationFacts {
  return ConversationFactsSchema.safeParse(input).success;
}

export function parseConversationFacts(input: unknown): ConversationFacts {
  return ConversationFactsSchema.parse(input);
}

export function safeParseConversationState(
  input: unknown,
): Result<ConversationState, ValidationFailure> {
  const result = ConversationStateSchema.safeParse(input);
  if (result.success) {
    return createSuccessResult(result.data);
  }
  return createValidationResult(result.error);
}

export function isConversationState(
  input: unknown,
): input is ConversationState {
  return ConversationStateSchema.safeParse(input).success;
}

export function parseConversationState(input: unknown): ConversationState {
  return ConversationStateSchema.parse(input);
}

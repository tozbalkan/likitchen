import type {
  FactExtractionPort,
  FactExtractionResult,
} from '../../application/conversation/ports/fact-extraction-port';
import type { PromptPackage } from '../../application/ai/prompt-builder';
import type { ProcessContext } from '../../shared/types';
import { ok, err, type Result } from '../../shared/result';
import {
  createExtractionFailure,
  type ExtractionFailure,
} from '../../shared/errors/extraction';
import { validateNoForbiddenFields } from './fact-extraction-schema';

export interface OpenAiFactExtractionAdapterProps {
  readonly apiKey?: string | undefined;
  readonly modelId?: string | undefined;
}

const AI_OUTPUT_JSON_SCHEMA = {
  type: 'json_schema',
  json_schema: {
    name: 'ai_output_contract',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        schema_version: { type: 'number' },
        extractedFacts: {
          type: 'object',
          properties: {
            schema_version: { type: 'number' },
            project_type: {
              type: ['string', 'null'],
              enum: [
                'full_kitchen_remodel',
                'cabinets_only',
                'countertops_only',
                'bathroom_remodel',
                'other',
                null,
              ],
            },
            location_raw: { type: ['string', 'null'] },
            budget_range: {
              type: ['string', 'null'],
              enum: [
                'under_15k',
                '15k_30k',
                '30k_60k',
                '60k_plus',
                'not_sure',
                null,
              ],
            },
            timeline: {
              type: ['string', 'null'],
              enum: ['asap', '1_3_months', '3_6_months', 'unsure', null],
            },
            attachments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  type: { type: 'string', enum: ['image', 'pdf', 'video'] },
                  url: { type: 'string' },
                  caption: { type: ['string', 'null'] },
                },
                required: ['id', 'type', 'url', 'caption'],
                additionalProperties: false,
              },
            },
            is_homeowner: { type: ['boolean', 'null'] },
            detected_language: { type: ['string', 'null'] },
            preferred_language: { type: ['string', 'null'] },
            conversation_summary: { type: ['string', 'null'] },
          },
          required: [
            'schema_version',
            'project_type',
            'location_raw',
            'budget_range',
            'timeline',
            'attachments',
            'is_homeowner',
            'detected_language',
            'preferred_language',
            'conversation_summary',
          ],
          additionalProperties: false,
        },
        confidence: { type: 'number' },
        missingInformation: {
          type: 'array',
          items: { type: 'string' },
        },
        suggestedFollowup: { type: ['string', 'null'] },
        notes: { type: 'string' },
      },
      required: [
        'schema_version',
        'extractedFacts',
        'confidence',
        'missingInformation',
        'suggestedFollowup',
        'notes',
      ],
      additionalProperties: false,
    },
  },
};

export class OpenAiFactExtractionAdapter implements FactExtractionPort {
  private readonly apiKey: string | undefined;
  private readonly modelId: string;

  constructor(props?: Readonly<OpenAiFactExtractionAdapterProps>) {
    this.apiKey = props?.apiKey ?? process.env.OPENAI_API_KEY;
    this.modelId = props?.modelId ?? 'gpt-4o-mini';
  }

  async extractFacts(
    message: string,
    promptPackage: PromptPackage,
    _context: Readonly<ProcessContext>,
  ): Promise<Result<FactExtractionResult, ExtractionFailure>> {
    if (!message || message.trim() === '') {
      return err(
        createExtractionFailure(
          'EMPTY_MESSAGE',
          'Message cannot be empty for fact extraction.',
        ),
      );
    }

    if (!this.apiKey) {
      return err(
        createExtractionFailure(
          'CONFIGURATION_ERROR',
          'OpenAI API key is missing. Live production AI extraction requires valid OPENAI_API_KEY configuration.',
        ),
      );
    }

    try {
      // Real OpenAI API call with Structured Outputs (json_schema & additionalProperties: false)
      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.modelId,
            response_format: AI_OUTPUT_JSON_SCHEMA,
            messages: [
              { role: 'system', content: promptPackage.systemPrompt },
              { role: 'user', content: message },
            ],
            temperature: 0.0,
          }),
        },
      );

      if (!response.ok) {
        return err(
          createExtractionFailure(
            'PROVIDER_HTTP_ERROR',
            `OpenAI API returned status ${response.status}`,
          ),
        );
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const rawContent = data.choices?.[0]?.message?.content ?? '{}';
      const parsed = JSON.parse(rawContent) as Record<string, unknown>;
      const extractedRaw =
        (parsed.extractedFacts as Record<string, unknown>) ?? parsed;

      // 1. Validate forbidden fields regression
      validateNoForbiddenFields(extractedRaw);

      // 2. Format as valid AiOutput schema structure for ValidationStep & ParsingStep
      const aiOutputContract = {
        schema_version: 1,
        extractedFacts: {
          schema_version: 1,
          project_type: extractedRaw.project_type ?? undefined,
          location_raw:
            extractedRaw.location_raw ?? extractedRaw.location ?? undefined,
          budget_range: extractedRaw.budget_range ?? undefined,
          timeline: extractedRaw.timeline ?? undefined,
          attachments: [],
        },
        confidence: 0.95,
        missingInformation: [],
        suggestedFollowup: null,
        notes: 'Extracted by OpenAiFactExtractionAdapter',
      };

      return ok({
        content: JSON.stringify(aiOutputContract),
        metadata: {
          engineId: `openai-${this.modelId}`,
          promptFingerprint: promptPackage.metadata.promptFingerprint,
          executionId: `exec-${Date.now()}`,
        },
      });
    } catch (e: unknown) {
      const errorMsg =
        e instanceof Error ? e.message : 'Unknown extraction error';
      return err(createExtractionFailure('PARSING_ERROR', errorMsg));
    }
  }
}

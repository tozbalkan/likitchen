import { describe, it, expect } from 'vitest';
import { OpenAiFactExtractionAdapter } from './openai-fact-extraction-adapter';
import { FactExtractionPromptBuilder } from './fact-extraction-prompt-builder';
import type {
  ProcessContext,
  CorrelationId,
  TraceId,
} from '../../shared/types';
import {
  validateNoForbiddenFields,
  FORBIDDEN_FIELDS,
} from './fact-extraction-schema';

describe('Milestone 030.1: OpenAiFactExtractionAdapter (DoD Tests)', () => {
  const promptBuilder = new FactExtractionPromptBuilder();
  const context: ProcessContext = {
    correlationId: 'corr-100' as CorrelationId,
    traceId: 'trace-100' as TraceId,
  };

  it('1. [DoD] Extracts validated facts via OpenAI Structured Outputs without mutation or decision fields', async () => {
    const originalFetch = globalThis.fetch;
    const mockOpenAiResponse = {
      choices: [
        {
          message: {
            content: JSON.stringify({
              schema_version: 1,
              extractedFacts: {
                schema_version: 1,
                project_type: 'full_kitchen_remodel',
                location_raw: 'Nassau County',
                budget_range: '30k_60k',
                timeline: '3_6_months',
                attachments: [],
                is_homeowner: true,
                detected_language: 'en',
                preferred_language: 'en',
                conversation_summary:
                  'Customer inquiring about full kitchen remodel in Nassau County',
              },
              confidence: 0.95,
              missingInformation: [],
              suggestedFollowup: null,
              notes: 'Extracted by OpenAI',
            }),
          },
        },
      ],
    };

    globalThis.fetch = async (): Promise<Response> => {
      return new Response(JSON.stringify(mockOpenAiResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    };

    try {
      const adapter = new OpenAiFactExtractionAdapter({
        apiKey: 'test-openai-key',
      });
      const promptPackage = promptBuilder.build(
        [],
        'We need a full kitchen remodel in Nassau County. Budget is around $40k.',
      );

      const result = await adapter.extractFacts(
        'We need a full kitchen remodel in Nassau County. Budget is around $40k.',
        promptPackage,
        context,
      );

      expect(result.ok).toBe(true);
      if (result.ok) {
        const payload = JSON.parse(result.value.content) as {
          extractedFacts: Record<string, unknown>;
        };
        const facts = payload.extractedFacts;

        expect(facts.project_type).toBe('full_kitchen_remodel');
        expect(facts.location_raw).toBe('Nassau County');
        expect(facts.budget_range).toBe('30k_60k');

        // Assert ZERO decision fields present
        for (const forbiddenKey of FORBIDDEN_FIELDS) {
          expect(facts).not.toHaveProperty(forbiddenKey);
        }
      }
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('2. [Fail-Closed] Fails with CONFIGURATION_ERROR when OPENAI_API_KEY is not configured', async () => {
    const savedKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;

    try {
      const adapter = new OpenAiFactExtractionAdapter({});
      const promptPackage = promptBuilder.build([], 'Hello kitchen remodel');

      const result = await adapter.extractFacts(
        'Hello kitchen remodel',
        promptPackage,
        context,
      );

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.reason).toBe('CONFIGURATION_ERROR');
        expect(result.error.message).toContain('OpenAI API key is missing');
      }
    } finally {
      if (savedKey) {
        process.env.OPENAI_API_KEY = savedKey;
      }
    }
  });

  it('2. [Regression DoD] Fails validation if provider returns forbidden decision fields', () => {
    const maliciousPayloads = [
      { project_type: 'kitchen', readiness: 'HIGH' },
      { score: 95 },
      { recommendation: 'Call sales rep immediately' },
      { priority: 'P0' },
      { qualification: 'QUALIFIED' },
      { sales_status: 'CLOSED' },
    ];

    for (const badPayload of maliciousPayloads) {
      expect(() => validateNoForbiddenFields(badPayload)).toThrow(
        'Forbidden field',
      );
    }
  });
});

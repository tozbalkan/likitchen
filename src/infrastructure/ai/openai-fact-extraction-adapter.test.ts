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

  it('1. [DoD] Extracts validated facts without mutation or decision fields', async () => {
    const adapter = new OpenAiFactExtractionAdapter();
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
      const facts = JSON.parse(result.value.content) as Record<string, unknown>;

      expect(facts.project_type).toBe('full_kitchen_remodel');
      expect(facts.location).toBe('Nassau County');
      expect(facts.budget_range).toBe('30k_60k');

      // Assert ZERO decision fields present
      for (const forbiddenKey of FORBIDDEN_FIELDS) {
        expect(facts).not.toHaveProperty(forbiddenKey);
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

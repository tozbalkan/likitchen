import { describe, it, expect } from 'vitest';
import { parseAiOutput, safeParseAiOutput } from './ai-output-schema';
import { AI_OUTPUT_SCHEMA_VERSION } from '../../../shared/contracts/versions';

describe('AiOutput Schema Boundary', () => {
  const validPayload = {
    schema_version: AI_OUTPUT_SCHEMA_VERSION,
    notes: 'This is a detailed reasoning string.',
    missingInformation: [],
    suggestedFollowup: null,
    confidence: 1,
    extractedFacts: {
      schema_version: 1,
      attachments: [],
      project_type: 'full_kitchen_remodel',
    },
  };

  it('should successfully parse a valid full payload', () => {
    const result = safeParseAiOutput(validPayload);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.schema_version).toBe(AI_OUTPUT_SCHEMA_VERSION);
      expect(
        (result.value.extractedFacts as Record<string, unknown>).project_type,
      ).toBe('full_kitchen_remodel');
    }
  });

  it('should enforce strictness and fail on unknown fields', () => {
    const strictPayload = { ...validPayload, randomField: 123 };
    const result = safeParseAiOutput(strictPayload);
    expect(result.ok).toBe(false);
  });

  it('should successfully parse using regular parse', () => {
    const result = parseAiOutput(validPayload);
    expect(result.schema_version).toBe(AI_OUTPUT_SCHEMA_VERSION);
  });

  it('should throw error on invalid parse payload', () => {
    const invalidPayload = { ...validPayload, notes: 123 as unknown as string };
    expect(() => parseAiOutput(invalidPayload)).toThrow();
  });

  it('should return false on safeParse for invalid payload', () => {
    const invalidPayload = { ...validPayload, notes: 123 as unknown as string }; // invalid type
    const result = safeParseAiOutput(invalidPayload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
    }
  });

  it('should fail parsing on invalid schema version', () => {
    const result = safeParseAiOutput({
      ...validPayload,
      schema_version: 2 as unknown as 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILURE');
    }
  });
});

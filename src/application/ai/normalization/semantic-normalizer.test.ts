import { describe, it, expect } from 'vitest';
import { SemanticNormalizer } from './semantic-normalizer';
import type { AiOutput } from '../contracts/ai-output-schema';

describe('SemanticNormalizer', () => {
  const normalizer = new SemanticNormalizer();

  it("should map 'unknown' and empty strings to undefined without mutating original", () => {
    const input: AiOutput = {
      schema_version: 1,
      confidence: 100,
      missingInformation: [],
      suggestedFollowup: null,
      notes: '',
      extractedFacts: {
        schema_version: 1,
        location_raw: '  ',
        project_type: undefined,
        attachments: [],
      },
    };

    const result = normalizer.normalize(input);

    expect(result).not.toBe(input); // no mutation
    expect(result.extractedFacts?.location_raw).toBeUndefined();
  });

  it('should safely handle missing fact blocks', () => {
    const input: AiOutput = {
      schema_version: 1,
      confidence: 100,
      missingInformation: [],
      suggestedFollowup: null,
      notes: '',
      extractedFacts: { schema_version: 1, attachments: [] },
    };

    const result = normalizer.normalize(input);
    expect(result.extractedFacts).toEqual({
      schema_version: 1,
      attachments: [],
    });
  });
});

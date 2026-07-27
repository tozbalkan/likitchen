import { describe, it, expect } from 'vitest';
import {
  parseConversationFacts,
  safeParseConversationFacts,
  isConversationFacts,
} from './conversation-facts.contract';

describe('ConversationFacts Schema Boundary', () => {
  const validFacts = {
    schema_version: 1,
    project_type: 'full_kitchen_remodel',
    location_raw: 'Austin',
    budget_range: '30k_60k',
    timeline: 'asap',
    attachments: [
      { id: '1', type: 'image', url: 'https://example.com/img.jpg' },
    ],
    is_homeowner: true,
    service_area_status: 'supported',
    town: 'Austin',
    county: 'Travis',
  };

  it('should successfully parse valid facts', () => {
    const result = safeParseConversationFacts(validFacts);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.project_type).toBe('full_kitchen_remodel');
    }
  });

  it('should enforce strictness and fail on unknown fields', () => {
    const strictPayload = { ...validFacts, unknownField: true };
    const result = safeParseConversationFacts(strictPayload);
    expect(result.ok).toBe(false);
  });

  it('should return false on safeParse for invalid enum value', () => {
    const invalidPayload = { ...validFacts, project_type: 'unknown_remodel' };
    const result = safeParseConversationFacts(invalidPayload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILURE');
    }
  });

  it('should validate regular parse', () => {
    const facts = parseConversationFacts(validFacts);
    expect(facts.schema_version).toBe(1);
  });

  it('isConversationFacts should work correctly', () => {
    expect(isConversationFacts(validFacts)).toBe(true);
    expect(isConversationFacts({ schema_version: 'wrong' })).toBe(false);
  });
});

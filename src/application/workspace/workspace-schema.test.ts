import { describe, it, expect } from 'vitest';
import {
  parseWorkspace,
  safeParseWorkspace,
  isWorkspace,
} from './workspace-schema';
import { WORKSPACE_SCHEMA_VERSION } from '../../shared/contracts/versions';

describe('Workspace Schema Boundary', () => {
  const validPayload = {
    schema_version: WORKSPACE_SCHEMA_VERSION,
    conversation: 'User: Hello\nAgent: Hi',
    facts: {
      schema_version: 1,
      project_type: 'full_kitchen_remodel',
      attachments: [],
      service_area_status: 'supported',
    },
    readiness: 75,
    confidence: 90,
    recommendation: 'route_to_human',
    status: 'qualified',
    photos: ['https://example.com/photo1.jpg'],
    source: 'web_chat',
    campaign: 'spring_promo',
  };

  it('should successfully parse a valid full payload', () => {
    expect(() => parseWorkspace(validPayload)).not.toThrow();

    const result = safeParseWorkspace(validPayload);
    expect(result.ok).toBe(true);

    expect(isWorkspace(validPayload)).toBe(true);
  });

  it('should throw on invalid payload with parseWorkspace', () => {
    const invalidPayload = { ...validPayload, readiness: 'high' }; // invalid type
    expect(() => parseWorkspace(invalidPayload)).toThrow();
  });

  it('should return false on safeParse for invalid payload', () => {
    const invalidPayload = { ...validPayload, status: 'unknown' }; // invalid enum
    const result = safeParseWorkspace(invalidPayload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeDefined();
    }
  });

  it('should fail parsing on invalid schema version', () => {
    const result = safeParseWorkspace({
      ...validPayload,
      schema_version: 2 as never, // Invalid version
    });
    expect(result.ok).toBe(false);
  });

  it('should return false on safeParse for missing required fields', () => {
    const invalidPayload = { ...validPayload, conversation: undefined };
    const result = safeParseWorkspace(invalidPayload);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_FAILURE');
    }
  });

  it('should enforce strictness and fail on unknown fields', () => {
    const strictPayload = { ...validPayload, unknownField: true };
    const result = safeParseWorkspace(strictPayload);
    expect(result.ok).toBe(false);
  });
});

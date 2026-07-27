import { describe, it, expect } from 'vitest';
import { calculateReadiness, calculateConfidence } from './scoring';
import { READINESS_WEIGHTS } from './readiness-policy';
import type { ConversationFacts, ExtractedFacts } from './conversation-facts';

describe('Scoring', () => {
  describe('calculateConfidence', () => {
    const emptyFacts: ExtractedFacts = { schema_version: 1, attachments: [] };

    it('should return 0 when all confidence fields are empty', () => {
      expect(calculateConfidence(emptyFacts)).toBe(0);
    });

    it('should return 100 when all confidence fields are filled', () => {
      const fullFacts: ExtractedFacts = {
        schema_version: 1,
        project_type: 'full_kitchen_remodel',
        location_raw: 'Austin',
        budget_range: 'not_sure',
        timeline: 'unsure',
        attachments: [{ id: '1', type: 'image', url: 'https://example.com/a' }],
        is_homeowner: true,
      };
      expect(calculateConfidence(fullFacts)).toBe(100);
    });

    it('should calculate partially filled fields proportionally', () => {
      // project_type, location_raw, is_homeowner (3 / 6) = 50%
      const partialFacts: ExtractedFacts = {
        schema_version: 1,
        project_type: 'cabinets_only',
        location_raw: 'Austin',
        is_homeowner: false, // Explicit false still counts as filled
        attachments: [],
      };
      expect(calculateConfidence(partialFacts)).toBe(50);
    });
  });

  describe('calculateReadiness', () => {
    const baseFacts: ConversationFacts = {
      schema_version: 1,
      attachments: [],
      service_area_status: 'supported',
    };

    it('should return null if service_area_status is unsupported', () => {
      expect(
        calculateReadiness({
          ...baseFacts,
          service_area_status: 'unsupported',
        }),
      ).toBeNull();
    });

    it('should return 0 when no readiness fields are filled', () => {
      expect(calculateReadiness(baseFacts)).toBe(0);
    });

    it('should accumulate weights accurately', () => {
      const bestLead: ConversationFacts = {
        ...baseFacts,
        project_type: 'full_kitchen_remodel',
        budget_range: '60k_plus',
        timeline: 'asap',
        attachments: [{ id: '1', type: 'image', url: 'https://example.com/a' }],
        is_homeowner: true,
      };
      const expectedScore =
        READINESS_WEIGHTS.full_kitchen_remodel_bonus +
        READINESS_WEIGHTS.budget_mentioned +
        READINESS_WEIGHTS.timeline_defined +
        READINESS_WEIGHTS.has_photos +
        READINESS_WEIGHTS.is_homeowner;

      expect(calculateReadiness(bestLead)).toBe(expectedScore);
    });

    it("should not accumulate points for 'not_sure' budget or 'unsure' timeline", () => {
      const unsureLead: ConversationFacts = {
        ...baseFacts,
        budget_range: 'not_sure',
        timeline: 'unsure',
      };
      expect(calculateReadiness(unsureLead)).toBe(0);
    });
  });
});

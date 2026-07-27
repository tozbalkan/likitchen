import { describe, it, expect } from 'vitest';
import { DefaultConversationMerger } from './conversation-merger';
import type { ExtractedFacts, ConversationFacts } from '../conversation-facts';

describe('DefaultConversationMerger', () => {
  const merger = new DefaultConversationMerger();

  it('should detect added fields', () => {
    const existing: ConversationFacts = {
      schema_version: 1,
      attachments: [],
      service_area_status: 'unresolved',
    };
    const incoming: ExtractedFacts = {
      schema_version: 1,
      attachments: [],
      project_type: 'full_kitchen_remodel',
    };

    const result = merger.merge(existing, incoming);

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields).toContain('project_type');
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0]!.type).toBe('added');
    expect(result.changes[0]!.field).toBe('project_type');
    expect(result.changes[0]!.newValue).toBe('full_kitchen_remodel');
    expect(result.facts.project_type).toBe('full_kitchen_remodel');
  });

  it('should detect updated fields', () => {
    const existing: ConversationFacts = {
      schema_version: 1,
      attachments: [],
      service_area_status: 'unresolved',
      project_type: 'full_kitchen_remodel',
    };
    const incoming: ExtractedFacts = {
      schema_version: 1,
      attachments: [],
      project_type: 'cabinets_only',
    };

    const result = merger.merge(existing, incoming);

    expect(result.hasChanges).toBe(true);
    expect(result.changedFields).toContain('project_type');
    expect(result.changes[0]!.type).toBe('updated');
    expect(result.changes[0]!.oldValue).toBe('full_kitchen_remodel');
    expect(result.changes[0]!.newValue).toBe('cabinets_only');
  });

  it('should not detect changes if values are identical', () => {
    const existing: ConversationFacts = {
      schema_version: 1,
      attachments: [],
      service_area_status: 'unresolved',
      project_type: 'full_kitchen_remodel',
    };
    const incoming: ExtractedFacts = {
      schema_version: 1,
      attachments: [],
      project_type: 'full_kitchen_remodel',
    };

    const result = merger.merge(existing, incoming);

    expect(result.hasChanges).toBe(false);
    expect(result.changedFields).toHaveLength(0);
  });
});

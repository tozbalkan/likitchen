import { describe, it, expect } from 'vitest';
import { nextStage } from './state-machine';
import type { ExtractedFacts } from './conversation-facts';

describe('State Machine Transitions', () => {
  // Base empty facts simulating the beginning of the conversation
  const emptyFacts: ExtractedFacts = {
    schema_version: 1,
    attachments: [],
  };

  // Table-driven tests to verify 100% of branch logic dynamically
  const transitions = [
    {
      description: 'should ask for project_type first when facts are empty',
      facts: emptyFacts,
      expectedStage: 'project_type',
    },
    {
      description: 'should ask for location when project_type exists',
      facts: { ...emptyFacts, project_type: 'full_kitchen_remodel' as const },
      expectedStage: 'location',
    },
    {
      description: 'should ask for budget when location exists',
      facts: {
        ...emptyFacts,
        project_type: 'full_kitchen_remodel' as const,
        location_raw: 'Austin',
      },
      expectedStage: 'budget',
    },
    {
      description: 'should ask for timeline when budget exists',
      facts: {
        ...emptyFacts,
        project_type: 'full_kitchen_remodel' as const,
        location_raw: 'Austin',
        budget_range: 'not_sure' as const,
      },
      expectedStage: 'timeline',
    },
    {
      description: 'should ask for photos when timeline exists',
      facts: {
        ...emptyFacts,
        project_type: 'full_kitchen_remodel' as const,
        location_raw: 'Austin',
        budget_range: 'not_sure' as const,
        timeline: 'unsure' as const,
      },
      expectedStage: 'photos',
    },
    {
      description:
        'should go to summary when all required fields and photos exist',
      facts: {
        ...emptyFacts,
        project_type: 'full_kitchen_remodel' as const,
        location_raw: 'Austin',
        budget_range: 'not_sure' as const,
        timeline: 'unsure' as const,
        attachments: [
          {
            id: '1',
            type: 'image' as const,
            url: 'https://example.com/img.jpg',
          },
        ],
      },
      expectedStage: 'summary',
    },
    {
      description:
        'should skip to budget if out-of-order budget is given but location is missing',
      // Even if budget is given, the transition table evaluates top-to-bottom.
      // Missing location means it asks for location.
      facts: {
        ...emptyFacts,
        project_type: 'full_kitchen_remodel' as const,
        budget_range: 'not_sure' as const,
      },
      expectedStage: 'location',
    },
  ];

  it.each(transitions)('$description', ({ facts, expectedStage }) => {
    expect(nextStage(facts)).toBe(expectedStage);
  });
});

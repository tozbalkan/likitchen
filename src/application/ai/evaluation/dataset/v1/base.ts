import type { EvaluationCase } from '../../evaluation-case';

export const v1Dataset: readonly EvaluationCase[] = [
  {
    id: 'v1-001',
    description: 'Basic greeting with intent',
    conversationHistory: [],
    inputMessage: 'Hi, I am looking to remodel my kitchen.',
    expectedFacts: {
      schema_version: 1,
      project_type: 'full_kitchen_remodel',
      attachments: [],
    },
    replaySnapshot: {
      providerResponse: `{"schemaVersion":1,"payload":{"project_type":"full_kitchen_remodel"}}`,
    },
  },
  {
    id: 'v1-002',
    description: 'Budget extraction',
    conversationHistory: [],
    inputMessage: 'My budget is around 25k to 30k.',
    expectedFacts: {
      schema_version: 1,
      budget_range: '15k_30k',
      attachments: [],
    },
    replaySnapshot: {
      providerResponse: `{"schemaVersion":1,"payload":{"budget_range":"15k_30k"}}`,
    },
  },
];

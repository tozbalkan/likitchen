import type {
  PromptBuilder,
  PromptPackage,
} from '../../application/ai/prompt-builder';

export class FactExtractionPromptBuilder implements PromptBuilder {
  build(
    _conversationHistory: readonly unknown[],
    newMessage: string,
  ): PromptPackage {
    const systemPrompt = [
      'You are a precise, single-turn Fact Extraction engine for LI Kitchen & Bed.',
      'Your sole responsibility is to extract explicit customer entities (project_type, location, budget_range, timeline, materials) from the customer message.',
      'CONSTRAINTS:',
      '- You MUST NOT guess or infer missing information.',
      '- You MUST NOT normalize location or budget values.',
      '- You MUST NOT output fields such as readiness, score, recommendation, priority, qualification, or sales_status.',
      '- You MUST return raw JSON matching the schema format.',
    ].join('\n');

    return {
      systemPrompt,
      userPrompt: newMessage,
      metadata: {
        promptVersion: 1,
        schemaVersion: 1,
        evaluationEngineVersion: 1,
        promptFingerprint: 'fact-extraction-v1',
      },
    };
  }
}

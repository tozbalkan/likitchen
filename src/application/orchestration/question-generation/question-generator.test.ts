import { describe, it, expect } from 'vitest';
import { QuestionGenerator } from './question-generator';

describe('QuestionGenerator', () => {
  it('should return fallback question when port is missing or fails', async () => {
    const generator = new QuestionGenerator();
    const result = await generator.generate({ factKey: 'budget_range' });

    expect(result.source).toBe('fallback');
    expect(result.text).toBe('What is your estimated budget for this project?');
    expect(result.promptFingerprint).toBe('static-fallback-v1');
  });

  it('should return LLM generated question when port succeeds', async () => {
    const mockPort = {
      generateQuestion: async () =>
        'How much are you planning to invest in your kitchen?',
    };
    const generator = new QuestionGenerator(mockPort);
    const result = await generator.generate({ factKey: 'budget_range' });

    expect(result.source).toBe('llm');
    expect(result.text).toBe(
      'How much are you planning to invest in your kitchen?',
    );
    expect(result.promptFingerprint).toBe('llm-dynamic-v1');
  });
});

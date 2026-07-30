export interface LLMTextContentPart {
  readonly type: 'text';
  readonly text: string;
}

export type LLMContentPart = LLMTextContentPart;

export function createTextPart(text: string): LLMTextContentPart {
  if (!text || text.trim() === '') {
    throw new Error('[LLMTextContentPart] text cannot be empty.');
  }
  return Object.freeze({
    type: 'text' as const,
    text,
  });
}

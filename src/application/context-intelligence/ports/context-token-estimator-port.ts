/**
 * Port for estimating token count from content string.
 * Initial adapter uses character-based estimation.
 * Production adapter can use model-specific tokenizer (tiktoken, etc.).
 */
export interface ContextTokenEstimatorPort {
  estimateTokens(content: string): number;
}

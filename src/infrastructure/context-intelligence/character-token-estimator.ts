import type { ContextTokenEstimatorPort } from '../../application/context-intelligence/ports/context-token-estimator-port';

/**
 * Character-based token estimation adapter.
 * Uses the standard approximation of ~4 characters per token.
 * Production adapter can swap this for model-specific tokenizer (tiktoken, etc.)
 * without any code changes to the application layer.
 */
export class CharacterBasedTokenEstimator implements ContextTokenEstimatorPort {
  estimateTokens(content: string): number {
    if (!content || content.length === 0) return 0;
    return Math.ceil(content.length / 4);
  }
}

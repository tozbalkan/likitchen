import type { ApplicationError } from '../../../shared/errors/error';
import { ok, err, type Result } from '../../../shared/result';

export interface TransportNormalizationError extends ApplicationError {
  readonly code: 'TransportNormalizationError';
}

export class TransportNormalizer {
  /**
   * Cleans up the raw string response from the LLM before it hits JSON parsing/validation.
   * - Removes markdown code blocks (e.g. ```json ... ```)
   * - Removes trailing commas if possible
   */
  normalize(rawContent: string): Result<string, TransportNormalizationError> {
    try {
      let cleaned = rawContent.trim();

      // Remove markdown code blocks
      const markdownMatch = cleaned.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
      if (markdownMatch && markdownMatch[1]) {
        cleaned = markdownMatch[1].trim();
      }

      // We could add trailing comma removal logic here if needed,
      // but for now, just returning the stripped block is usually enough for Zod.

      return ok(cleaned);
    } catch (e: unknown) {
      return err({
        code: 'TransportNormalizationError',
        message: `Failed to normalize transport string: ${(e as Error).message}`,
      });
    }
  }
}

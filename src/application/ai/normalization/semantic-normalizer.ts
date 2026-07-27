import type { AiOutput } from '../contracts/ai-output-schema';

export class SemanticNormalizer {
  /**
   * Cleans up the validated contract BEFORE it hits the parser.
   * - Maps "unknown" or empty string to undefined.
   * - Trims whitespace.
   * - Lowercases emails.
   *
   * ARCHITECTURAL RULE:
   * This class MUST NOT infer business data (e.g. mapping "Austin area" to "Austin").
   */
  normalize(contract: AiOutput): AiOutput {
    const result = JSON.parse(JSON.stringify(contract)) as unknown as Record<
      string,
      unknown
    >;

    const facts = result.extractedFacts as Record<string, unknown> | undefined;
    if (facts) {
      for (const [key, value] of Object.entries(facts)) {
        if (typeof value === 'string') {
          facts[key] = this.cleanString(value);
        }
      }

      if (facts.location_raw) {
        facts.service_area_status = 'unresolved';
      }
    }

    return result as AiOutput;
  }

  private cleanString(val: string | undefined | null): string | undefined {
    if (!val) return undefined;
    const trimmed = val.trim();
    if (trimmed === '' || trimmed.toLowerCase() === 'unknown') {
      return undefined;
    }
    return trimmed;
  }
}

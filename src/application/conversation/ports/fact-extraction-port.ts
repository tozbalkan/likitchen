import type { ProcessContext } from '../../../shared/types';
import type { Result } from '../../../shared/result';
import type { ExtractionFailure } from '../../../shared/errors/extraction';
import type { TokenUsage } from '../../../shared/metrics/token-usage';
import type { PromptPackage } from '../../ai/prompt-builder';

export interface FactExtractionResult {
  readonly content: string;
  readonly usage?: TokenUsage;
  readonly metadata?: {
    readonly engineId: string;
    readonly promptFingerprint: string;
    readonly executionId: string;
  };
}

export interface FactExtractionPort {
  /**
   * Evaluates the new message against the existing conversation state and returns a structured extraction payload.
   */
  extractFacts(
    message: string,
    promptPackage: PromptPackage,
    context: Readonly<ProcessContext>,
  ): Promise<Result<FactExtractionResult, ExtractionFailure>>;
}

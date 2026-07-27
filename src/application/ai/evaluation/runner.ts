import type { EvaluationCase } from './evaluation-case';
import type { EvaluationReport } from './report';
import type { PromptBuilder } from '../prompt-builder';
import { TransportNormalizer } from '../normalization/transport-normalizer';
import { ConversationParser } from '../../conversation/use-cases/process-user-message/parser';
import { SemanticNormalizer } from '../normalization/semantic-normalizer';

export type RunnerMode = 'mock' | 'replay';

export class EvaluationRunner {
  private readonly ENGINE_VERSION = 1;

  constructor(
    private readonly promptBuilder: PromptBuilder,
    private readonly transportNormalizer: TransportNormalizer,
    private readonly semanticNormalizer: SemanticNormalizer,
    private readonly parser: ConversationParser,
  ) {}

  async run(
    dataset: readonly EvaluationCase[],
    datasetName: string,
    mode: RunnerMode,
  ): Promise<EvaluationReport> {
    // Evaluate logic will go here.
    // It should loop through dataset and use the prompt builder + mock provider (if mock)
    // or the recordedMockResponse (if replay), then run normalizers + parser to get facts
    // and compare against expectedFacts.

    return {
      engineVersion: this.ENGINE_VERSION,
      promptVersion: 1, // Will come from PromptPackage
      schemaVersion: 1, // Will come from PromptPackage
      datasetVersion: datasetName,
      totalCases: dataset.length,
      passedCases: 0,
      failedCases: dataset.length,
      accuracy: 0,
      recommendationAccuracy: 0,
      ruleCoverage: {},
      decisionDrift: 0,
      averageTokens: 0,
      averageCost: 0,
    };
  }
}

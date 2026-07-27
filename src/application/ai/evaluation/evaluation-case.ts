import type { ExtractedFacts } from '../../../domain/conversation/conversation-facts';

import type { ConversationAssessment } from '../../../domain/conversation/recommendation';
import type { AiOutput } from '../contracts/ai-output-schema';
import type { MergeResult } from '../../../domain/conversation/pipeline/fact-change';
import type { CalibrationResult } from '../calibration';
import type { PromptPackage } from '../prompt-builder';

import type {
  RecommendationType,
  RecommendationDecision,
} from '../../../domain/conversation/recommendation/types';

export interface ReplaySnapshot {
  readonly promptPackage?: PromptPackage;
  readonly providerResponse?: string;
  readonly transportNormalized?: string;
  readonly validatedContract?: AiOutput;
  readonly semanticNormalized?: AiOutput;
  readonly parsedFacts?: ExtractedFacts;
  readonly mergeResult?: MergeResult;
  readonly assessment?: ConversationAssessment;
  readonly calibration?: CalibrationResult;
  readonly recommendationDecision?: RecommendationDecision;
}

export interface EvaluationCase {
  readonly id: string;
  readonly description: string;
  readonly conversationHistory: readonly unknown[];
  readonly inputMessage: string;

  // The expected outcome we are testing against
  readonly expectedFacts: ExtractedFacts;
  readonly expectedRecommendation?: RecommendationType;

  // For replay mode, the pre-recorded snapshot of the full pipeline state
  readonly replaySnapshot?: ReplaySnapshot;
}

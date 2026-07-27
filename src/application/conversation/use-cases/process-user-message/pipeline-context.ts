import type { ProcessContext, Uuid } from '../../../../shared/types';
import type { Conversation } from '../../../../domain/conversation/entities';
import type { ExtractedFacts } from '../../../../domain/conversation/conversation-facts';
import type { MergeResult } from '../../../../domain/conversation/pipeline/fact-change';
import type { ConversationAssessment } from '../../../../domain/conversation/recommendation';
import type { FactExtractionResult } from '../../ports/fact-extraction-port';
import type { PromptPackage } from '../../../ai/prompt-builder';
import type { AiOutput } from '../../../ai/contracts/ai-output-schema';
import type { ProcessUserMessageResponse } from './process-user-message-response';

/**
 * Immutable context that flows through the pipeline.
 * Each step returns a new instance with updated properties.
 *
 * ARCHITECTURAL RULE:
 * This context is STRICTLY a state bag for the pipeline.
 * It must NEVER contain:
 * - Service dependencies (e.g., repositories, clients, helpers)
 * - Configuration values
 * - Any functions or behavior
 *
 * Each pipeline step should only read the fields it strictly requires.
 */
export interface PipelineContext {
  readonly processContext: Readonly<ProcessContext>;
  readonly message: string;
  readonly conversationId: Uuid;
  readonly expectedRevision: number;

  readonly conversation?: Conversation;
  readonly promptPackage?: PromptPackage;
  readonly rawAiResponse?: FactExtractionResult;
  readonly validatedContract?: AiOutput;
  readonly parsedFacts?: ExtractedFacts;
  readonly mergeResult?: MergeResult;
  readonly assessmentSnapshot?: ConversationAssessment;
  readonly response?: ProcessUserMessageResponse;
}

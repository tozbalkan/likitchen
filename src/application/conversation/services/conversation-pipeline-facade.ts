import type { ProcessUserMessageCommand } from '../use-cases/process-user-message/process-user-message-use-case';
import { ProcessUserMessageUseCase } from '../use-cases/process-user-message/process-user-message-use-case';
import { FactExtractionStep } from '../use-cases/process-user-message/steps/fact-extraction.step';
import { MergeFactsStep } from '../use-cases/process-user-message/steps/merge-facts.step';
import { ApplyFactsStep } from '../use-cases/process-user-message/steps/apply-facts.step';
import { AssessmentStep } from '../use-cases/process-user-message/steps/assessment.step';
import { ResponseMappingStep } from '../use-cases/process-user-message/steps/response-mapping.step';
import type { FactExtractionPort } from '../ports/fact-extraction-port';
import type { PromptBuilder } from '../../ai/prompt-builder';
import type { ConversationMergerStrategy } from '../../../domain/conversation/pipeline/conversation-merger';
import type { Clock } from '../../ports/clock';
import type {
  ProcessContext,
  CorrelationId,
  TraceId,
  Uuid,
} from '../../../shared/types';

export interface ConversationPipelineFacadeProps {
  readonly extractionPort: FactExtractionPort;
  readonly promptBuilder: PromptBuilder;
  readonly factMerger: ConversationMergerStrategy;
  readonly clock: Clock;
}

export class ConversationPipelineFacade {
  private readonly useCase: ProcessUserMessageUseCase;

  constructor(props: Readonly<ConversationPipelineFacadeProps>) {
    const uuidGen = { generate: () => `uuid-${Date.now()}` as Uuid };
    this.useCase = new ProcessUserMessageUseCase([
      new FactExtractionStep(props.extractionPort, props.promptBuilder),
      new MergeFactsStep(props.factMerger),
      new AssessmentStep(props.clock),
      new ApplyFactsStep(props.clock, uuidGen),
      new ResponseMappingStep(),
    ]);
  }

  async processIncomingMessage(
    conversationId: Uuid,
    messageText: string,
    expectedRevision: number = 0,
  ): Promise<{
    readonly replyText: string;
    readonly isReadyForHandoff: boolean;
  }> {
    const processContext: ProcessContext = {
      correlationId: `corr-${Date.now()}` as CorrelationId,
      traceId: `trace-${Date.now()}` as TraceId,
    };

    const command: ProcessUserMessageCommand = {
      conversationId,
      message: messageText,
      expectedRevision,
    };

    const result = await this.useCase.execute(command, processContext);

    if (!result.ok) {
      return {
        replyText:
          'Thank you for contacting LI Kitchen & Bed. How can we assist you with your project?',
        isReadyForHandoff: false,
      };
    }

    const nextAction = result.value.nextAction;
    const isReady = result.value.assessment.readiness >= 70;

    const replyText = `Thank you! We have logged your details. Next step: ${nextAction}`;

    return {
      replyText,
      isReadyForHandoff: isReady,
    };
  }
}

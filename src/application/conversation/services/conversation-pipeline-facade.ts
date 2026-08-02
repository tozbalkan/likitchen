import type { ProcessUserMessageCommand } from '../use-cases/process-user-message/process-user-message-use-case';
import { ProcessUserMessageUseCase } from '../use-cases/process-user-message/process-user-message-use-case';
import { LoadConversationStep } from '../use-cases/process-user-message/steps/load-conversation.step';
import { FactExtractionStep } from '../use-cases/process-user-message/steps/fact-extraction.step';
import { ValidationStep } from '../use-cases/process-user-message/steps/validation.step';
import { ParsingStep } from '../use-cases/process-user-message/steps/parsing.step';
import { MergeFactsStep } from '../use-cases/process-user-message/steps/merge-facts.step';
import { AssessmentStep } from '../use-cases/process-user-message/steps/assessment.step';
import { ApplyFactsStep } from '../use-cases/process-user-message/steps/apply-facts.step';
import { PersistStep } from '../use-cases/process-user-message/steps/persist.step';
import { ResponseMappingStep } from '../use-cases/process-user-message/steps/response-mapping.step';

import type { ConversationStore } from '../ports/conversation-store';
import type { ConversationUnitOfWork } from '../ports/conversation-uow';
import type { FactExtractionPort } from '../ports/fact-extraction-port';
import type { PromptBuilder } from '../../ai/prompt-builder';
import type { ConversationMergerStrategy } from '../../../domain/conversation/pipeline/conversation-merger';
import type { Clock } from '../../ports/clock';
import type {
  MessageDeliveryPort,
  DeliveryResult,
} from '../../ports/messaging/message-delivery-port';
import { TransportNormalizer } from '../../ai/normalization/transport-normalizer';
import { ConversationParser } from '../use-cases/process-user-message/parser';

import type {
  ProcessContext,
  CorrelationId,
  TraceId,
  Uuid,
} from '../../../shared/types';
import { ok, err, type Result } from '../../../shared/result';
import type { ApplicationError } from '../../../shared/errors/error';

export interface ConversationPipelineFacadeProps {
  readonly conversationStore: ConversationStore;
  readonly conversationUnitOfWork: ConversationUnitOfWork;
  readonly extractionPort: FactExtractionPort;
  readonly promptBuilder: PromptBuilder;
  readonly factMerger: ConversationMergerStrategy;
  readonly clock: Clock;
  readonly messageDeliveryPort?: MessageDeliveryPort | undefined;
  readonly uuidGenerator?: { generate(): Uuid };
}

export interface ConversationPipelineResult {
  readonly replyText: string;
  readonly isReadyForHandoff: boolean;
  readonly deliveryResult?: DeliveryResult | undefined;
}

export class ConversationPipelineFacade {
  private readonly useCase: ProcessUserMessageUseCase;
  private readonly messageDeliveryPort?: MessageDeliveryPort | undefined;

  constructor(props: Readonly<ConversationPipelineFacadeProps>) {
    const uuidGen = props.uuidGenerator ?? {
      generate: () => `uuid-${Date.now()}` as Uuid,
    };
    const transportNormalizer = new TransportNormalizer();
    const conversationParser = new ConversationParser();

    this.messageDeliveryPort = props.messageDeliveryPort;

    // Exact required invariant execution order
    this.useCase = new ProcessUserMessageUseCase([
      new LoadConversationStep(props.conversationStore),
      new FactExtractionStep(props.extractionPort, props.promptBuilder),
      new ValidationStep(transportNormalizer),
      new ParsingStep(conversationParser),
      new MergeFactsStep(props.factMerger),
      new AssessmentStep(props.clock),
      new ApplyFactsStep(props.clock, uuidGen),
      new PersistStep(props.conversationUnitOfWork),
      new ResponseMappingStep(),
    ]);
  }

  async processIncomingMessage(
    conversationId: Uuid,
    messageText: string,
    expectedRevision: number = 0,
    recipientPhoneNumber?: string,
  ): Promise<Result<ConversationPipelineResult, ApplicationError>> {
    const processContext: ProcessContext = {
      correlationId: `corr-${Date.now()}` as CorrelationId,
      traceId: `trace-${Date.now()}` as TraceId,
    };

    const command: ProcessUserMessageCommand = {
      conversationId,
      message: messageText,
      expectedRevision,
    };

    // Execute pipeline steps
    const result = await this.useCase.execute(command, processContext);

    // Fail closed: propagate error if any pipeline step fails
    if (!result.ok) {
      return err(result.error);
    }

    const nextAction = result.value.nextAction;
    const isReady = result.value.assessment.readiness >= 70;
    const replyText = `Thank you! We have logged your details. Next step: ${nextAction}`;

    let deliveryResult: DeliveryResult | undefined;

    // Deliver outbound WhatsApp message if recipient & delivery port available
    if (this.messageDeliveryPort && recipientPhoneNumber) {
      const delivery = await this.messageDeliveryPort.sendMessage({
        channel: 'whatsapp',
        recipient: recipientPhoneNumber,
        content: replyText,
      });
      if ('value' in delivery) {
        deliveryResult = delivery.value;
      }
    }

    return ok({
      replyText,
      isReadyForHandoff: isReady,
      deliveryResult,
    });
  }
}

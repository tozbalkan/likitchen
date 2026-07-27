import type { ProcessContext } from '../../../shared/types';
import { UseCase } from '../../use-case';
import { Result, ok, err } from '../../../shared/result';
import type { ApplicationError } from '../../../shared/errors';
import { ConflictFailure, ValidationFailure } from '../../../shared/errors';
import type { Uuid } from '../../../shared/types';

import type { ConversationStore } from '../ports/conversation-store';
import type { EventDispatcher } from '../../ports/event-dispatcher';
import type { Clock } from '../../ports/clock';
import type { UuidGenerator } from '../../ports/uuid-generator';
import type { Logger } from '../../ports/logger';

import { Conversation } from '../../../domain/conversation/entities';
import type { StartConversationResponse } from '../responses';

export type StartConversationInput = Readonly<{
  conversationId: string;
  source: string;
}>;

export class StartConversationUseCase extends UseCase<
  StartConversationInput,
  StartConversationResponse
> {
  public readonly name = 'StartConversation';
  public readonly version = 1;

  constructor(
    private readonly conversationStore: ConversationStore,
    private readonly eventDispatcher: EventDispatcher,
    private readonly clock: Clock,
    private readonly uuidGenerator: UuidGenerator,
    private readonly logger: Logger,
  ) {
    super();
  }

  public async execute(
    input: StartConversationInput,
    processContext: Readonly<ProcessContext>,
  ): Promise<Result<StartConversationResponse, ApplicationError>> {
    this.logger.info(`Executing ${this.name}`, {
      conversationId: input.conversationId,
    });

    // 1. validate
    if (!input.conversationId || !input.source) {
      return err(new ValidationFailure('Invalid input', { input }));
    }
    const id = input.conversationId as Uuid;

    // 2. authorize (assuming authorized for this use case)

    // 3. load aggregate
    let conversation: Conversation;
    const findResult = await this.conversationStore.findById(id);

    if (findResult.ok) {
      conversation = findResult.value;
    } else {
      conversation = Conversation.start(id);
    }

    const expectedRevision = conversation.revision;

    // 4. execute aggregate behavior
    const outcome = conversation.start(
      input.source,
      this.uuidGenerator.generate(),
      this.clock.now(),
    );

    if (!outcome.success) {
      return err(new ConflictFailure(outcome.error));
    }

    // 5. persist
    if (!outcome.idempotent) {
      const saveResult = await this.conversationStore.save(
        conversation,
        expectedRevision,
      );
      if (!saveResult.ok) {
        return saveResult; // Concurrency conflict or other persistence failure
      }
    }

    // 6. publish events
    const releasedEvents = conversation.releaseEvents();
    if (releasedEvents.length > 0) {
      await this.eventDispatcher.dispatch(releasedEvents, processContext);
    }

    // 7. map response
    return ok({
      conversationId: conversation.id,
      idempotent: outcome.idempotent,
      revision: conversation.revision,
    });
  }
}

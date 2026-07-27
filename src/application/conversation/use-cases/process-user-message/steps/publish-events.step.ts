import type { PipelineStep } from './pipeline-step';
import type { PipelineContext } from '../pipeline-context';
import { ok, err, type Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import type { EventDispatcher } from '../../../../ports/event-dispatcher';

export class PublishEventsStep implements PipelineStep {
  constructor(private readonly dispatcher: EventDispatcher) {}

  async execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>> {
    if (!context.conversation) {
      return err({
        code: 'MissingStateError',
        message: 'conversation is missing from context.',
      });
    }

    const releasedEvents = context.conversation.releaseEvents();
    try {
      if (releasedEvents.length > 0) {
        await this.dispatcher.dispatch(releasedEvents, context.processContext);
      }
    } catch (e: unknown) {
      // Depending on the outbox pattern, this might be fire-and-forget or fully reliable.
      // For now, return an error if it fails.
      return err({ code: 'EventPublishError', message: (e as Error).message });
    }

    return ok(context);
  }
}

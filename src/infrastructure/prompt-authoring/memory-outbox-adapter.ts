import type { OutboxPort } from '../../application/prompt-authoring/ports/outbox-port';
import { PromptAuthoringEvent } from '../../application/prompt-authoring/prompt-authoring-events';

/**
 * MemoryOutboxAdapter
 * [TEST / DEBUG ONLY — Not registered in production composition root.
 * Production implementation intentionally omitted — will be fulfilled by Capability-023]
 */
export class MemoryOutboxAdapter implements OutboxPort {
  private readonly events: PromptAuthoringEvent[] = [];

  async recordEvent(event: Readonly<PromptAuthoringEvent>): Promise<void> {
    this.events.push(event as PromptAuthoringEvent);
  }

  async getPendingEvents(): Promise<ReadonlyArray<PromptAuthoringEvent>> {
    return Object.freeze([...this.events]);
  }
}

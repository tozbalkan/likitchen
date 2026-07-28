import type { OutboxPort } from '../../application/tool-platform/ports/outbox-port';
import { ToolDomainEvent } from '../../application/tool-platform/vo/tool-domain-events';

/**
 * MemoryToolOutboxAdapter
 * [TEST / DEBUG ONLY — Not registered in production composition root.
 * Production implementation intentionally omitted — will be fulfilled by Capability-023]
 */
export class MemoryToolOutboxAdapter implements OutboxPort {
  private readonly events: ToolDomainEvent[] = [];

  async recordEvent(event: Readonly<ToolDomainEvent>): Promise<void> {
    this.events.push(event as ToolDomainEvent);
  }

  async getPendingEvents(): Promise<ReadonlyArray<ToolDomainEvent>> {
    return Object.freeze([...this.events]);
  }
}

import type { OutboxPort } from '../../application/planning-orchestration/ports/outbox-port';
import type { PlanDomainEvent } from '../../application/planning-orchestration/vo/plan-domain-events';

/**
 * [TEST / DEBUG ONLY — Never register inside production composition root.]
 */
export class MemoryPlanOutboxAdapter implements OutboxPort {
  private readonly events: PlanDomainEvent[] = [];

  async publish(event: Readonly<PlanDomainEvent>): Promise<void> {
    this.events.push(event as PlanDomainEvent);
  }

  async getPendingEvents(): Promise<ReadonlyArray<PlanDomainEvent>> {
    return Object.freeze([...this.events]);
  }

  async clear(): Promise<void> {
    this.events.length = 0;
  }
}

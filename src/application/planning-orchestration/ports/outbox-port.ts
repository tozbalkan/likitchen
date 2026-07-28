import type { PlanDomainEvent } from '../vo/plan-domain-events';

export interface OutboxPort {
  publish(event: Readonly<PlanDomainEvent>): Promise<void>;
  getPendingEvents(): Promise<ReadonlyArray<PlanDomainEvent>>;
}

import type {
  DomainEventPublisher,
  DomainEventHandler,
} from '../../domain/events/domain-event-publisher';
import type { DomainEvent } from '../../domain/events/domain-event';

/**
 * Tenant-aware in-memory implementation of DomainEventPublisher.
 * Stores published events in audit history and dispatches to registered handlers.
 */
export class InMemoryDomainEventPublisher implements DomainEventPublisher {
  private readonly handlers = new Map<
    string,
    Set<DomainEventHandler<string, unknown>>
  >();
  private readonly publishedEvents: Array<DomainEvent<string, unknown>> = [];

  subscribe<TType extends string, TPayload>(
    eventType: TType,
    handler: DomainEventHandler<TType, TPayload>,
  ): void {
    const set =
      this.handlers.get(eventType) ??
      new Set<DomainEventHandler<string, unknown>>();
    set.add(handler as DomainEventHandler<string, unknown>);
    this.handlers.set(eventType, set);
  }

  async publish<TType extends string, TPayload>(
    event: Readonly<DomainEvent<TType, TPayload>>,
  ): Promise<void> {
    this.publishedEvents.push(event as DomainEvent<string, unknown>);
    const set = this.handlers.get(event.type);
    if (!set) return;

    for (const handler of set) {
      await handler(event);
    }
  }

  async publishMany<TType extends string, TPayload>(
    events: ReadonlyArray<Readonly<DomainEvent<TType, TPayload>>>,
  ): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }

  getPublishedEvents(): ReadonlyArray<DomainEvent<string, unknown>> {
    return Object.freeze([...this.publishedEvents]);
  }

  clear(): void {
    this.publishedEvents.length = 0;
  }
}

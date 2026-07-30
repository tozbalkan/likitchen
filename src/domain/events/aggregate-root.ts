import type { DomainEvent } from './domain-event';

/**
 * Base abstract class for Domain-Driven Design Aggregate Roots.
 * Provides internal domain event recording (raiseDomainEvent) and retrieval
 * without leaking event dispatching infrastructure into the domain logic.
 */
export abstract class AggregateRoot<TId = string> {
  private readonly _domainEvents: Array<DomainEvent<string, unknown>> = [];

  abstract get id(): TId;

  protected raiseDomainEvent<TType extends string, TPayload>(
    event: Readonly<DomainEvent<TType, TPayload>>,
  ): void {
    this._domainEvents.push(event as DomainEvent<string, unknown>);
  }

  get domainEvents(): ReadonlyArray<DomainEvent<string, unknown>> {
    return Object.freeze([...this._domainEvents]);
  }

  clearDomainEvents(): void {
    this._domainEvents.length = 0;
  }
}

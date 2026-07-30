import type { DomainEvent } from './domain-event';

export interface DomainEventPublisher {
  publish<TType extends string, TPayload>(
    event: Readonly<DomainEvent<TType, TPayload>>,
  ): Promise<void>;

  publishMany<TType extends string, TPayload>(
    events: ReadonlyArray<Readonly<DomainEvent<TType, TPayload>>>,
  ): Promise<void>;
}

export type DomainEventHandler<TType extends string, TPayload> = (
  event: Readonly<DomainEvent<TType, TPayload>>,
) => Promise<void> | void;

# ADR-014: Reliable Domain Event Delivery

## Status

Accepted

## Context

As we migrate to a rich Domain Model (`Conversation` Aggregate Root), state changes produce Domain Events (e.g., `ConversationStartedEvent`, `ConversationContinuedEvent`). These events represent immutable past-tense facts that the system has successfully processed.

Currently, our Use Cases persist the aggregate using `ConversationStore.save()` and then immediately publish the events using `EventPublisher.publish()`. While functional, this approach lacks strict atomicity: if the application crashes _after_ saving to the database but _before_ publishing the events, the events are permanently lost, leaving external systems (e.g., downstream read models, AI processors, webhooks) out of sync.

As our system scales and orchestrates complex integrations like AI pipelines (Capability-006) and webhooks, we need a guarantee that emitted domain events are reliably delivered.

## Decision

We will transition our event delivery mechanism in phases:

### Phase 1: Direct Publish (Current)

- The Application orchestrator invokes `save()` on the aggregate store, then immediately publishes released events.
- **Trade-offs**: Simple to implement but risks event loss upon crash. Acceptable only during early MVP development.

### Phase 2: Transactional Outbox (Planned)

- Use Cases will save the Aggregate state and append the emitted domain events to a local `Outbox` table within the **same atomic database transaction**.
- A separate background worker (or CDC tailing process) will read from the `Outbox` and publish events.
- **Guarantee**: At-least-once delivery.
- **Trade-offs**: Requires transaction coordination in the store and a background processor. Requires idempotent consumers since events may be delivered more than once.

### Phase 3: Broker Integration (Future)

- The Outbox worker will publish to a durable message broker (e.g., Kafka, RabbitMQ, SQS).
- **Guarantee**: High scalability, consumer groups, replayability.

## Consequences

- **Event Immutability:** Domain Events must only contain business state. Transport-level metadata (e.g., `TraceId`, `CorrelationId`) must be injected by the EventPublisher or Outbox processor, not the Domain.
- **Idempotency:** Because the Outbox pattern guarantees _at-least-once_ delivery, all event consumers must be strictly idempotent to handle duplicate events gracefully.
- **Store Capabilities:** The `ConversationStore` implementation must eventually be upgraded to support transactional bounds that encompass both the `Conversation` table and the `Outbox` table.

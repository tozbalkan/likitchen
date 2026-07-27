# ADR-011: Application Use Case Pattern

## Status

Accepted

## Context

As the Application layer grows, developers tend to scatter business logic between Application and Domain, creating "fat" orchestrators. We need a rigid structure to ensure the Application layer remains thin, testable, and strictly focused on coordination.

## Decision

All incoming requests to the system must be handled by a Use Case that implements the standard `UseCase<I, O, E>` abstract class.

### The "Thin Application" Principle

The Use Case orchestrates the flow. The Domain makes the decisions.

### Standard Execution Flow

Every `execute` method must strictly adhere to the following sequence:

1. **Validate Contract**: Ensure the input adheres to the Application boundary schemas.
2. **Load Dependencies**: Fetch needed entities via Ports (e.g., Repositories).
3. **Call Pure Domain**: Pass the entities/facts to the Domain for decision making.
4. **Persist State**: Save the mutated entities back via Ports.
5. **Publish Events**: Dispatch Domain Events to notify other parts of the system.
6. **Return Result**: Always return a unified `Result<T, E>`.

### Error Handling

Use Cases do not throw exceptions for expected failures. They return typed errors (e.g., `ValidationFailure`, `NotFoundError`) mapped into the `Result` type. Exceptions are reserved for truly unexpected panics (e.g., out of memory, database connection lost).

## Consequences

- **Pros**: Every feature follows the exact same pattern, making the codebase highly predictable and easy to onboard. Orchestration logic is completely decoupled from business logic.
- **Cons**: Adds initial boilerplate (Ports, DTOs, Event definitions) even for simple CRUD operations.

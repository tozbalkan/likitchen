# ADR-013: Domain Model Ownership

## Status

Accepted

## Context

As the application grows, there is a risk of tight coupling between the Domain layer and the external validation schemas (like Zod) or data transport formats. This blurs the line between defining what a concept is and validating its serialized format.

## Decision

The Domain owns the model. Contracts validate the model. Contracts never define the model.

- **Pure TypeScript**: The Domain layer must define all entities, value objects, and facts as pure TypeScript interfaces or types.
- **Validation in Contracts**: Validation libraries (Zod, Valibot, ArkType, etc.) belong strictly in the Application or Infrastructure layers (Contracts).
- **ZodType Interface Binding**: When defining a schema in the Application layer to parse input for the Domain, the schema must satisfy the Domain interface natively:
  ```ts
  const MyDomainModelSchema: z.ZodType<MyDomainModel> = z.object({ ... });
  ```

## Rationale

The Domain model evolves according to business requirements, never according to transport formats or validation libraries.

If JSON payloads, OpenAI output formats, or validation libraries change in the future, the Domain layer must remain completely unaffected.

## Consequences

- **Pros**: The Domain is completely framework and library agnostic. We can swap Zod for Valibot with zero changes to Domain files.
- **Cons**: Minor duplication, as we must declare the TypeScript interface in the Domain and mirror its structure in the Zod schema in the Application contracts.

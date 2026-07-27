# ADR-007: Contract Layer Architecture

## Status

Accepted

## Context

As the LI-KITCHEN architecture matures, the boundaries between the internal domain and external data consumers (such as the UI Workspace or AI providers) require strict enforcement. Relying purely on documentation or implicit interfaces leads to data integrity issues and tight coupling to specific validation libraries (like Zod) across the entire application.

## Decision

We establish a definitive **Contract Layer** within the architecture that governs all data boundaries.

1. **Domain Contracts vs Application Contracts**
   - **Domain Contracts** (e.g., `ConversationFacts`) reside in `src/domain/` and define the core, immutable truths of the business logic.
   - **Application Contracts** (e.g., `AiOutput`, `Workspace`) reside in `src/application/` and define external boundaries, representing view models or integration payloads.

2. **Validation Strategy & Encapsulation**
   - We use Zod for validation but **never expose Zod directly** outside of the contract file.
   - Every contract exports specific wrapper functions: `parse<Name>(input: unknown)`, `safeParse<Name>(input: unknown)`, and `is<Name>(input: unknown): input is <Name>`.
   - `safeParse` returns a custom `ContractResult<T>` (success/error structure), completely abstracting away the validation library's native error format. This future-proofs the codebase if we migrate away from Zod.

3. **Immutability and Strictness**
   - All contract types are inferred as deeply immutable using `ReadonlyDeep<T>`.
   - External boundary contracts (AI, Workspace) strictly use `.strict()` or `.strip()` to prevent unknown fields from leaking into the system.
   - All external contracts include a version constant (e.g., `schema_version: 1`) to facilitate future migrations safely.

## Consequences

- **Pros**: The rest of the application is completely decoupled from Zod. Type integrity is guaranteed at the system edges. Business logic is safely separated from data parsing.
- **Cons**: Requires boilerplate for every schema (defining wrappers and types).

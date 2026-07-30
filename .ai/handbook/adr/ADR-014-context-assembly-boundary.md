# ADR-014: Context Assembly Boundary

## Status

Accepted

## Context

With Capability-024 (Execution) and Capability-025 (Memory & Knowledge) frozen, a new layer is needed to compose their outputs into agent-ready context. The risk is that this layer duplicates retrieval, authorization, or memory lifecycle logic already owned by those capabilities.

## Decision

Capability-026 is a **composition layer**, not a retrieval or memory management layer.

1. **026 does not own retrieval.** It delegates all memory/knowledge retrieval to Capability-025's `MemoryAccessEvaluator` and `HybridRetrievalEngine`.
2. **026 does not own execution state.** It reads Capability-024 state through `ExecutionPlanRepositoryPort.findInstanceById()` and `findGraphById()` — read-only, never writes.
3. **026 does not own memory lifecycle.** It does not create, update, supersede, archive, or delete `MemoryRecord` or `KnowledgeDocument` instances.
4. **026 owns context assembly.** It normalizes data from multiple sources into `ContextEntry` objects, detects semantic conflicts, applies deterministic ordering, enforces budgets, and produces immutable `ContextSnapshot` aggregates.

## Consequences

- **Pros**: Clear responsibility boundaries. 026 cannot introduce authorization bugs because it never touches raw repositories. Testing is simplified because 026's correctness depends only on the composition logic, not on retrieval correctness.
- **Cons**: 026 is coupled to 025's `AuthorizedCandidateSet` contract. If 025 changes its authorization model, 026 must adapt.

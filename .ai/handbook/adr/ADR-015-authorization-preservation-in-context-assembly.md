# ADR-015: Authorization Preservation in Context Assembly

## Status

Accepted

## Context

Context assembly must never bypass or weaken the authorization boundary established by Capability-025. An agent receiving unauthorized data could leak tenant secrets, violate scope isolation, or make decisions based on data the caller has no right to access.

## Decision

The `ContextAssembler` service **never directly accesses** `MemoryRepositoryPort` or `KnowledgeRepositoryPort`.

### Enforcement Mechanisms

1. **Constructor type signature**: `ContextAssembler` accepts `MemoryAccessEvaluator` and `HybridRetrievalEngine`, not raw repository ports. This makes unauthorized access a compile-time error.
2. **Dependency-cruiser rule**: The `application-layer-rules` rule prevents any application-layer code from importing infrastructure adapters, blocking workarounds.
3. **Authorization-before-retrieval invariant**: Memory and knowledge candidates are obtained exclusively through `MemoryAccessEvaluator.buildAuthorizedCandidateSet()`, which enforces tenant boundary checks, scope boundary validation, and `ACTIVE`-only filtering.
4. **Execution state**: Capability-024 data is read through `ExecutionPlanRepositoryPort.findInstanceById()`, which returns `undefined` for non-matching tenants.

### Pipeline Order

```
TenantContext + planInstanceId
    → MemoryScopeContext.fromPlanInstance()
    → MemoryAccessEvaluator.buildAuthorizedCandidateSet()
    → AuthorizedCandidateSet (ONLY this reaches HybridRetrievalEngine)
    → HybridRetrievalEngine.search()
    → ContextEntry[] (normalized)
```

## Consequences

- **Pros**: Authorization is structurally guaranteed, not just tested. Any future developer modifying `ContextAssembler` cannot accidentally introduce a raw repository call.
- **Cons**: If retrieval needs evolve (e.g., vector search), the changes must go through Capability-025's ports rather than being added directly to 026.

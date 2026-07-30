# ADR-016: Deterministic Context Selection & Conflict Handling

## Status

Accepted

## Context

Context assembly for agent decision intelligence must be reproducible, provenance-aware, and budget-enforced. When assembling context from multiple scopes and source types, deterministic prioritization rules are required to ensure that identical requests against identical source states produce identical context snapshots. Furthermore, semantic conflicts between sources must be handled cleanly without silently choosing a winner at the assembly level.

## Decision

We adopt the following deterministic context selection, conflict handling, and snapshot persistence policies:

### 1. Static Priority Order & Precedence

The static priority order across source types is:

`SYSTEM_CONTEXT > VARIABLE > ARTIFACT > EXECUTION_TRACE > MEMORY > KNOWLEDGE`

- Priority is used for deterministic precedence and sorting, NOT for wholesale replacement of lower-priority sources.
- Multi-scope specificity hierarchy: `PLAN_INSTANCE (5) > USER (4) > WORKSPACE (3) > ORGANIZATION (2) > TENANT (1)`.
- Combined entry priority formula: `priority = (scopeSpecificity * 10000) + (sourcePriority * 1000) + Math.round(relevanceScore * 100)`.

### 2. Conflict Handling (DEFERRED_TO_AGENT)

- The context assembly layer detects semantic conflicts (e.g. contradictory memory facts, cross-scope disagreement, memory vs knowledge collisions).
- The assembly layer **does NOT silently resolve semantic conflicts**.
- All competing entries are preserved (budget permitting), tagged with `conflictStatus: 'COMPETING'`, and recorded in a `ContextConflict` descriptor with `resolutionState: 'DEFERRED_TO_AGENT'`.
- The decision-making agent remains responsible for semantic conflict resolution.

### 3. Deterministic Tie-Breaking & SHA-256 Checksum

- Sorting order: `priority DESC`, then `relevanceScore DESC`, then `entryId ASC` (lexicographic tie-breaker).
- `ContextSnapshot` computes a canonical SHA-256 checksum over request metadata, canonicalized entries, and conflicts.
- Identical request parameters and source data produce identical logical snapshot checksums.

### 4. Mandatory Snapshot Persistence

- Every context assembly produces an immutable `ContextSnapshot`.
- Snapshots are persisted via `ContextSnapshotRepositoryPort` with strict tenant isolation.
- Snapshots enable auditability, replayability, and offline debugging.

## Consequences

- **Pros**: 100% reproducible context assembly, complete provenance on every item, zero silent data loss from hidden conflict resolution decisions.
- **Cons**: Snapshots require storage (mitigated in production via snapshot compaction / retention policies in P2 backlog).

# Platform Architectural Principles

This document defines the **12 Immutable Architectural Principles** of the Agent Intelligence & Execution Platform.

These principles govern all capability design, implementation, code reviews, and architectural sign-offs. They take precedence over individual capability preferences.

---

## The 12 Invariant Principles

### 1. Tenant Isolation First

**Rule**: Multi-tenancy is not an afterthought or a database filter added later. Every domain operation, service call, repository lookup, and snapshot query **strictly requires a valid `TenantContext`**. Cross-tenant data retrieval or mutation is structurally forbidden.

---

### 2. Pure Domain Rules (DDD Boundary)

**Rule**: Domain entities, aggregates, and value objects must be written in **pure TypeScript** with zero external dependencies (no Zod, Prisma, Express, Next.js, or ORMs). The domain model owns business rules, invariants, and state transitions.

---

### 3. Ports & Adapters Policy (Hexagonal Isolation)

**Rule**: The Application layer interacts with external dependencies (databases, AI providers, tools, timers) **exclusively through abstract interfaces (`Ports`)**. Concrete implementations (`Adapters`) live in the Infrastructure layer. Framework types must never leak into Application or Domain layers.

---

### 4. Authorization-Before-Retrieval

**Rule**: Higher-level composition layers must never query raw data repositories directly. Retrieval must always be preceded by structural authorization evaluation (e.g. `MemoryAccessEvaluator.buildAuthorizedCandidateSet()`). Authorized candidate sets are built before search or retrieval execution occurs.

---

### 5. Frozen Capability Contracts

**Rule**: Once a capability reaches **FROZEN** status, its source code is immutable. Higher-level capabilities consume frozen capabilities strictly through existing public contracts and ports. Modifying a frozen capability requires an explicit, approved ADR exception.

---

### 6. Immutable Snapshots & Replayability

**Rule**: Execution traces, decision inputs, knowledge version snapshots, and context snapshots are **strictly immutable**. Every snapshot includes a canonical SHA-256 checksum. Mutating past execution records is forbidden; updates produce new versions, preserving auditability and offline replayability.

---

### 7. Explicit Provenance Tracking

**Rule**: Every context item, memory record, and knowledge document must carry full provenance. Information used in agent reasoning must be traceable to its source type, source identifier, scope, version, checksum, and confidence score.

---

## 8. DEFERRED_TO_AGENT Conflict Preservation

**Rule**: The context assembly and data retrieval layers **must never silently discard or resolve semantic conflicts**. Assembly layers prepare and structure evidence. Competing facts are preserved and tagged with `resolutionState: 'DEFERRED_TO_AGENT'` for explicit reasoning by the agent or LLM.

---

### 9. Multi-Scope Specificity Precedence

**Rule**: Scopes operate in a clear hierarchy of specificity: `PLAN_INSTANCE (5) > USER (4) > WORKSPACE (3) > ORGANIZATION (2) > TENANT (1)`. When competing facts exist across scopes, more specific scopes carry higher precedence without erasing lower-scope background context.

---

### 10. Event-Driven & Idempotent Integration

**Rule**: Cross-capability integration relies on idempotent operations and reliable event patterns (Outbox Pattern). Retrying an operation with the same request/idempotency key must produce identical results without duplicate side effects.

---

### 11. Zero-Breaking-Changes Policy

**Rule**: Upgrades and new capabilities must be non-breaking and backward compatible. Upstream capability contracts must remain stable so that downstream capabilities can rely on unfrozen active baselines.

---

### 12. Quality Gate Supremacy

**Rule**: No capability is considered complete or ready for sign-off until all 4 automated quality gates pass with zero errors/violations:

- `pnpm typecheck` (TypeScript static analysis)
- `npx eslint src --quiet` (Code formatting & style rules)
- `npx vitest run` (100% pass across all unit and contract tests)
- `npx dependency-cruiser src` (Clean Architecture dependency direction check)

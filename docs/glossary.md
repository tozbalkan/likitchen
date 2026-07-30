# Platform Domain & Technical Glossary

This glossary defines key terms, concepts, aggregates, value objects, and domain abstractions used across the Agent Intelligence & Execution Platform.

---

## Identity & Operations Concepts

### `TenantContext`

Value object representing the identity boundary of a request. Carries `tenantId`, `organizationId`, `workspaceId`, `environment`, and `region`. Mandatory for all domain operations.

### `DeploymentProfile`

Operational configuration value object governing resilience policies (retry attempts, backoff timing, circuit breaker thresholds, rate limits, timeouts) for a given deployment environment (`development`, `test`, `production`).

---

## Planning & Workflow Orchestration Concepts (Capability-024)

### `ExecutionGraph`

Immutable Directed Acyclic Graph (DAG) representation of a workflow plan. Contains `nodes: ReadonlyArray<PlanNode>`, `edges: ReadonlyArray<PlanEdge>`, topological sorting algorithms, parallel tier calculations, and a canonical SHA-256 graph checksum.

### `PlanNode`

Single execution step in a plan graph. Contains `nodeId`, `name`, `behaviorType` (`PROMPT`, `TOOL`, `APPROVAL`, `DECISION`, `CONDITION`, `DELAY`, `PARALLEL`, `MERGE`), execution contract, policy, payload, and optional compensation node ID.

### `ExecutionPlanInstance`

Aggregate root managing the runtime execution state of a plan instance. Tracks `cursor: ExecutionCursor`, `variables`, `artifacts`, `checkpoints`, `trace: ExecutionTrace`, `consumedCostUSD`, `state` (`PLANNED`, `RUNNING`, `COMPLETED`, `FAILED`, `CANCELLED`), and optimistic `concurrencyVersion`.

### `ExecutionCursor`

Value object tracking the node execution pointers of an instance: `completedNodeIds`, `runningNodeIds`, `waitingNodeIds`, `pendingNodeIds`, and `lastActiveNodeId`.

### `VariableReference`

Value object representing a workflow variable with `key`, `value`, `type`, `scope` (`GLOBAL`, `NODE_LOCAL`, `TRANSIENT`), `persistencePolicy`, and `producerNodeId`.

### `ArtifactReference`

Value object representing an out-of-memory payload produced by a graph node. Carries `artifactId`, `name`, `uri` (storage location), `mimeType`, `sizeBytes`, and `producerNodeId`.

### `ExecutionTrace` & `ExecutionSpan`

Domain models capturing execution observability telemetry. `ExecutionSpan` tracks `spanId`, `nodeId`, `behaviorType`, duration, status (`SUCCESS`, `FAILED`, `CHECKPOINT_WAIT`), token counts, cost in USD, and error trace messages.

### `ExecutionCheckpoint`

Value object representing a human-in-the-loop approval checkpoint with `approvalStatus` (`PENDING`, `APPROVED`, `REJECTED`), `approverId`, comments, and creation timestamp.

---

## Memory & Knowledge Platform Concepts (Capability-025)

### `MemoryScopeContext`

Hierarchical scope representation enforcing scope invariants. Scopes include `TENANT`, `ORGANIZATION`, `WORKSPACE`, `USER`, and `PLAN_INSTANCE`. Generates unique calculated `scopeId`.

### `MemoryRecord`

Aggregate root representing long-term agent memory facts. Contains `memoryId`, `scopeContext`, `memoryType` (`SEMANTIC_FACT`, `EPISODIC_EVENT`, `PROCEDURAL_RULE`, `PREFERENCE`), `key`, `content`, `confidenceScore`, state (`ACTIVE`, `SUPERSEDED`, `ARCHIVED`, `DELETED`), and optimistic version locks.

### `KnowledgeDocument`

Aggregate root representing authoritative external knowledge documents. Contains `knowledgeId`, `scopeContext`, `sourceType` (`DOCUMENT`, `URL`, `STRUCTURED_DATA`, `EXECUTION_ARTIFACT`), immutable `versions: ReadonlyArray<KnowledgeVersionSnapshot>`, `provenance`, and `freshness`.

### `KnowledgeVersionSnapshot`

Immutable snapshot of a knowledge document version carrying `versionId`, `checksum` (SHA-256), `title`, `summary`, `contentChunks`, and timestamp.

### `MemoryAccessEvaluator`

Application service responsible for evaluating scope boundaries and building an `AuthorizedCandidateSet` before retrieval occurs.

### `AuthorizedCandidateSet`

Immutable collection of authorized memory records and knowledge documents built by `MemoryAccessEvaluator` after applying strict tenant and scope isolation rules.

### `HybridRetrievalEngine`

Service executing multi-factor search over authorized candidates using semantic similarity fallback, keyword matching, recency exponential decay, and document freshness multipliers.

### `MemoryConflictResolver`

Service detecting contradictory active memory records for identical keys and resolving them using configured policies (`MOST_RECENT_WINS`, `HIGHEST_CONFIDENCE_WINS`).

---

## Context Intelligence Concepts (Capability-026)

### `ContextAssemblyRequest`

Incoming request VO containing `requestId` (idempotency key), tenant hierarchy, `planInstanceId`, `nodeId`, `query`, list of permitted scopes, `tokenBudget`, and `maxItems`.

### `ContextEntry`

Normalized context item containing `entryId`, `sourceType` (`SYSTEM_CONTEXT`, `VARIABLE`, `ARTIFACT`, `EXECUTION_TRACE`, `MEMORY`, `KNOWLEDGE`), `sourceId`, `scope`, computed `priority`, `content`, `tokenEstimate`, `relevanceScore`, `conflictStatus`, and mandatory `evidence: EvidenceReference`.

### `EvidenceReference`

Discriminated union (`MemoryEvidence | KnowledgeEvidence | ArtifactEvidence | VariableEvidence | ExecutionTraceEvidence | SystemContextEvidence`) establishing 100% provenance traceability for every context entry.

### `ContextConflict`

Descriptor representing a detected semantic conflict between competing facts. Carries `conflictId`, `semanticKey`, `competingEntryIds`, `conflictType`, `priorityMetadata`, and `resolutionState: 'DEFERRED_TO_AGENT'`.

### `ContextSnapshot`

Immutable aggregate root representing the complete assembled decision context. Carries `snapshotId`, `requestId`, `snapshotChecksum` (SHA-256), entries, conflicts, assembly trace, and tenant context.

### `ContextAssembler`

Primary application service executing the 11-step deterministic context assembly pipeline.

---

## Architectural Terms

### **Clean Architecture**

Architectural pattern separating software into concentric layers with inward-pointing dependencies: `Shared → Domain → Application → Infrastructure → App`.

### **Ports & Adapters (Hexagonal Architecture)**

Pattern decoupling core application logic from external infrastructure. Application defines abstract `Ports`; Infrastructure implements concrete `Adapters`.

### **Frozen Capability**

A completed capability whose source code is locked against direct modification. Downstream capabilities consume frozen capabilities strictly via public ports and contracts.

### **DEFERRED_TO_AGENT**

Conflict resolution policy where assembly layers preserve competing evidence without silently choosing a winner, delegating semantic reasoning to the agent runtime.

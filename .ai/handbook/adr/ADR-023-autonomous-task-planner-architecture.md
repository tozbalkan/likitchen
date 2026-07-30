# ADR-023: Autonomous Task Planner Architecture, Sub-Goal Decomposition & Immutable Execution Cursor

- **Status**: Accepted
- **Date**: July 30, 2026
- **Authors**: Principal Software Architect & Core AI Engineering Team
- **Capability**: `capability-028` (Autonomous Task Planner)
- **Category**: `[PLANNING]` Task Decomposition, Sub-Goal Orchestration & Immutable Cursor Snapshots

---

## Context & Problem Statement

`Capability-027` established the hardened Agent Execution & Tool Invocation Runtime. `Capability-028` introduces the **Autonomous Task Planner**, responsible for breaking high-level user goals into structured sub-goals and driving plan progression through `Capability-027`.

Without strict architectural boundaries:

1. Attempting to change `Capability-027`'s frozen `ReasoningEnginePort` method signature breaks backward compatibility.
2. Mutating plan definitions or execution cursor objects in-place creates non-deterministic state tracking and race conditions.
3. Conflating node definitions (`SubGoalNode`) with execution state (`SubGoalStatus`) pollutes immutable plan structures.
4. Conflating execution failure with replanning failure complicates audit logs.

---

## Accepted Invariant Mandate

> **Mandatory Invariant**: `AutonomousPlan` is an immutable plan definition. `PlanExecutionCursor` is an immutable execution snapshot. No execution step or replanning mutates an existing plan or past cursor. Replanning produces a new `PlanVersion`.

---

## Core Architectural Decisions (P0 & P1 Resolved)

### 1. Contract Alignment with `Capability-027` (`executeCycle`)

- The Planner communicates with `Capability-027` strictly through the frozen `ReasoningEnginePort.executeCycle(...)` interface using `SubGoalExecutionRequest`:

```typescript
export interface SubGoalExecutionRequest {
  readonly planId: string;
  readonly planVersion: number;
  readonly subGoalId: string;
  readonly prompt: string;
  readonly tenantContext: TenantContext;
}
```

### 2. Immutable `PlanExecutionCursor` Snapshot

- `PlanExecutionCursor` is an **immutable snapshot**. Advancing cursor status returns a new `PlanExecutionCursor` instance (`cursor.advance(nodeId, newStatus) -> new Cursor`).

### 3. Plan Versioning for Dynamic Replanning

- `AutonomousPlan` is deeply immutable.
- Dynamic replanning creates a brand-new `AutonomousPlan` with incremented `planVersion` (e.g., `v2`) referencing `parentPlanVersion` (`v1`). Completed nodes from `v1` are referenced in `v2` as historical completed nodes without mutating `v1`.

### 4. Decoupling Definition (`SubGoalNode`) from Execution State

- `SubGoalNode` is purely an immutable definition: `{ subGoalId: string, title: string, objective: string, isRequired: boolean, dependencies: string[], successCriteria: string }`.
- `SubGoalNode` contains ZERO `status` field. All execution statuses live in `PlanExecutionCursor.nodeStatuses: Map<string, SubGoalStatus>`.

### 5. Failure Classification & Failure Decision Matrix

- **Failure Types**:
  - `SUBGOAL_EXECUTION_FAILED`: Runtime exception during sub-goal execution.
  - `PLAN_GENERATION_FAILED`: Failure during initial plan decomposition.
  - `REPLAN_FAILED`: Failure during sub-plan revision.
- **`SubGoalFailureDecision`**: Evaluated based on node requirement (`isRequired`), failure type, and plan context. `SKIP_OPTIONAL` is strictly invalid for required nodes.

### 6. DAG Invariant for Dependencies

- Sub-goal dependency structures must form a **Directed Acyclic Graph (DAG)**. Plan validation rejects circular dependencies (`A -> B -> C -> A`) with `InvalidPlanError`.

### 7. Plan Generation Source

- Iteration 1 uses a provider-independent `PlanGeneratorPort` (with deterministic contract implementations for testing and initial rollout).

---

## Capability Boundary & Architecture Diagram

```text
                    Capability-028 (Autonomous Planner)
                                     │
                             TaskPlannerPort
                                     │
                          AutonomousTaskPlanner
                                     │
        ┌────────────────────────────┴────────────────────────────┐
        │                                                         │
 AutonomousPlan (v1, v2)                                   PlanExecutionCursor
 Deeply Immutable                                          Immutable Snapshot
        │                                                         │
        └────────────────────────────┬────────────────────────────┘
                                     │
                            SubGoalNode
                            Immutable Definition
                                     │
                                     ▼
                          SubGoalExecutionRequest
                                     │
                                     ▼
                          ReasoningEnginePort.executeCycle(...)
                                     │
                                     ▼
                    Capability-027 (Execution Runtime)
```

---

## Compliance & Verification

- **ADR-009 / ADR-010**: Pure domain VOs, 0 framework dependencies.
- **ADR-018..ADR-022**: Preserves frozen 027 contracts, immutable dispatchers, resilience decorators, and streaming chunk contracts.
- **Contract Tests**: Verified by `autonomous-planner.contract.test.ts`.

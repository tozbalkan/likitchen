# ADR-023: Autonomous Task Planner Architecture, Sub-Goal Decomposition & Execution State Separation

- **Status**: Proposed
- **Date**: July 30, 2026
- **Authors**: Principal Software Architect & Core AI Engineering Team
- **Capability**: `capability-028` (Autonomous Task Planner)
- **Category**: `[PLANNING]` Task Decomposition, Sub-Goal Orchestration & Plan State Separation

---

## Context & Problem Statement

`Capability-027` established the hardened Agent Execution & Tool Invocation Runtime. `Capability-028` introduces the **Autonomous Task Planner**, responsible for breaking high-level user goals into structured sub-goals and driving plan progression through `Capability-027`.

Without strict architectural boundaries:

1. The Planner risks duplicating a second ReAct reasoning loop or directly dispatching tools, bypassing `Capability-027`.
2. Mutating plan definitions during execution creates non-deterministic state tracking and breaks auditability.
3. Conflating sub-goal failure handling with LLM retry policies causes layer leaks.

---

## Answers to the 5 Core Architectural Design Questions

### Question 1: Dynamic Replanning vs. One-shot Static Plan Generation

**Decision**: The Planner supports **Initial Plan Generation** followed by **Controlled Dynamic Replanning**.

- When a sub-goal execution completes with unexpected outcomes or recoverable failures, the Planner can trigger a replanning cycle that appends or adjusts remaining sub-goals without invalidating completed sub-goals.

### Question 2: Immutable Plan Definition vs. Execution State Separation

**Decision**: Strict separation between the **Immutable Plan Definition** (`AutonomousPlan`) and the **Mutable Plan Cursor** (`PlanExecutionCursor`).

- `AutonomousPlan`: Deeply immutable Value Object representing sub-goal nodes, dependencies, and success criteria.
- `PlanExecutionCursor`: Stateful tracking object storing current sub-goal status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `FAILED`, `SKIPPED`).

### Question 3: Sub-Goal Failure Handling & Recovery Policy

**Decision**: Sub-goal failures are governed by explicit `SubGoalFailurePolicy` enum:

- `REPLAN`: Invoke Planner to decompose remaining work into a new sub-plan.
- `SKIP_OPTIONAL`: If the sub-goal is marked non-critical, skip and continue.
- `HALT_PLAN`: Terminate the entire plan immediately with `FAILED` status.

### Question 4: Minimum Contract to Execution Runtime (`Capability-027`)

**Decision**: The Planner communicates with `Capability-027` ONLY via `ReasoningEnginePort`:

```typescript
interface SubGoalExecutionContract {
  readonly subGoalId: string;
  readonly prompt: string;
  readonly tenantContext: TenantContext;
}
```

The Planner passes the sub-goal prompt to `ReasoningEnginePort.runReasoningLoop(...)` and receives `ReActCycleResult`. Zero direct tool or adapter access!

### Question 5: Plan Completion Evaluation Criteria

**Decision**: A Plan achieves `COMPLETED` status when:

1. All required sub-goals are `COMPLETED`.
2. All optional sub-goals are either `COMPLETED` or `SKIPPED`.
3. No active sub-goals remain `PENDING` or `IN_PROGRESS`.

---

## Strict Capability Boundaries

```text
Capability-028 (Autonomous Task Planner)
├── Goal Interpretation
├── Sub-Goal Decomposition (AutonomousPlan)
├── Execution Progression (PlanExecutionCursor)
└── Replanning Policy (SubGoalFailurePolicy)
        │
        │ SubGoalExecutionContract (Prompt + TenantContext)
        ▼
Capability-027 (Agent Execution Runtime)
├── ReasoningEnginePort (ReAct Loop)
├── Resilience Decorators (Retry, Circuit Breaker)
└── ToolDispatcherPort (Tool Execution)
```

### Mandatory Non-Goals & Prohibitions

- ❌ **No Direct Tool Access**: Planner NEVER accesses `ToolDispatcherPort` or tool adapters.
- ❌ **No Resilience Math**: Planner NEVER manages LLM retries, backoff, or circuit breakers.
- ❌ **No Streaming / Token Accounting**: Planner NEVER consumes raw transport stream chunks or token decorators.
- ❌ **No ReAct State Mutation**: Planner NEVER mutates `ReasoningStep` arrays.

---

## Proposed Component & Interface Layout for Capability-028

### 1. Domain & Value Objects (`src/domain/planning/`)

- **`AutonomousPlan`**: Immutable plan definition VO containing `PlanId`, `GoalPrompt`, and `SubGoalNode[]`.
- **`SubGoalNode`**: Sub-goal definition VO `{ subGoalId: string, title: string, description: string, isOptional: boolean, dependencies: string[] }`.
- **`PlanExecutionCursor`**: Stateful progression tracker `{ planId: PlanId, currentSubGoalId?: string, statuses: Map<string, SubGoalStatus> }`.

### 2. Application Ports & Services (`src/application/planning/`)

- **`TaskPlannerPort`**: Interface `createPlan(...)`, `evaluateProgress(...)`, `replan(...)`.
- **`AutonomousTaskPlannerService`**: Application service orchestrating planning logic and delegating sub-goals to `ReasoningEnginePort`.

---

## Compliance & Verification

- **ADR-009 / ADR-010**: Pure domain VOs, 0 framework dependencies.
- **ADR-018..ADR-022**: Preserves immutable dispatchers, deterministic state machine boundaries, resilience decorators, and streaming chunk contracts.
- **Contract Tests**: Verified by `autonomous-planner.contract.test.ts`.

# ADR-024: Multi-Agent Swarm Consensus, Delegation Topologies & Execution Isolation

- **Status**: Accepted
- **Date**: August 1, 2026
- **Authors**: Principal Software Architect & Core AI Engineering Team
- **Capability**: `capability-029` (Multi-Agent Swarm Orchestration)
- **Category**: `[ORCHESTRATION]` Multi-Agent Delegation, Consensus Aggregation & Concurrency Control

---

## Context & Problem Statement

`Capability-027` provided the Agent Execution Runtime and `Capability-028` provided the Autonomous Task Planner. `Capability-029` introduces **Multi-Agent Swarm Orchestration**, enabling specialized worker agents to execute delegated sub-tasks in parallel and form deterministic consensus.

Without strict architectural boundaries:

1. Orchestrators carrying mutable instance state create race conditions during concurrent swarm invocations.
2. Unbounded parallel worker executions (`Promise.all`) exhaust system resources.
3. Swarm timeouts that fail to propagate `AbortSignal` leave orphan agent worker processes running in the background.
4. Evaluating consensus using completion order leads to non-deterministic results across runs.

---

## Accepted Invariant Mandates (P0 & P1 Resolved)

1. **Stateless Orchestrator Instance & Invocation-Scoped State**: `SwarmOrchestratorService` has zero mutable instance state. `SwarmExecutionState` is strictly invocation-scoped.
2. **Hard Concurrency Throttling**: `maxConcurrentAgents` (default: 4) is enforced as a strict hard limit at runtime (e.g. semaphore/batching). Worker executions are never launched all at once via `Promise.all()`.
3. **Cascading Cancellation Propagation**: Swarm timeouts or outer `options.signal` cancellations propagate an `AbortSignal` to every active worker agent's `ReasoningEnginePort.executeCycle(...)` call to prevent orphan executions.
4. **Deterministic Canonical Result Ordering**: `SwarmAgentResult` carries `delegationIndex: number`. Results are sorted by `delegationIndex` before consensus strategies evaluate them.
5. **Normalized Confidence Source**: `SwarmAgentResult` carries normalized `confidenceScore` (0.0 to 1.0). Consensus strategies consume normalized confidence and never recalculate it.
6. **Explicit Quorum Policy**: Separates `SwarmFailurePolicy` (`RETRY_AGENT`, `QUORUM_DEGRADED_OK`, `HALT_SWARM`) from `SwarmConsensusPolicy` (`minimumParticipants`, `minimumSuccessfulAgents`).
7. **Agent Retry Budget (`maxAgentAttempts`)**: Swarm worker agent retries are bounded by `maxAgentAttempts` (default: 2), separate from Capability-027 transient LLM retries.
8. **DAG Dual Purpose**: Delegation DAG handles both cycle prevention AND parallel execution dependency scheduling.
9. **Capabilities as Metadata**: `AgentDescriptor.capabilities` is strictly routing metadata, NOT an authorization mechanism.
10. **Application Port Ownership**: `SwarmOrchestratorPort` is owned by `Capability-029` (`src/application/swarm/ports/`). `Capability-028` consumes it as a clean port.

---

## Swarm Architecture & Execution Diagram

```text
Capability-028 (Planner)
            │
            │ SwarmTaskRequest
            ▼
Capability-029 (Swarm Orchestration)
            │
            ├── SwarmOrchestratorService (100% Stateless Instance)
            ├── SwarmExecutionState (Invocation-Scoped)
            ├── Hard Concurrency Throttling (maxConcurrentAgents = 4)
            ├── Cascading Cancellation (AbortSignal Propagation)
            ├── SwarmAgentResult (delegationIndex, confidenceScore: 0.0 - 1.0)
            └── Deterministic Consensus Strategy (Sorted by delegationIndex)
            │
            ├── Worker Agent 1 ──┐
            ├── Worker Agent 2 ──┼──> ReasoningEnginePort.executeCycle(..., { signal })
            └── Worker Agent 3 ──┘           (Capability-027 Runtime)
```

---

## Mandatory Non-Goals & Prohibitions

- ❌ **No Direct Tool Invocation by Swarm**: Swarm agents NEVER access `ToolDispatcherPort` or tool adapters directly.
- ❌ **No Peer-to-Peer Agent Calls**: Agents NEVER invoke other agents directly outside `SwarmOrchestratorPort`.
- ❌ **No Shared Mutable Memory**: Zero shared mutable state across worker agents.

---

## Proposed Component & Interface Layout for Capability-029

### 1. Domain & Value Objects (`src/application/swarm/vo/`)

- **`AgentDescriptor`**: Immutable agent definition `{ agentId: string, role: string, capabilities: readonly string[] }`.
- **`SwarmAgentResult`**: Immutable result `{ agentId: string, delegationIndex: number, output: string, confidenceScore: number }`.
- **`SwarmConsensusResult`**: Aggregated consensus output `{ finalOutput: string, aggregatedConfidence: number, participatingAgents: readonly string[] }`.
- **`SwarmConcurrencyPolicy`**: Hard concurrency limit `{ maxConcurrentAgents: number, swarmTimeoutMs: number }`.
- **`SwarmConsensusPolicy`**: Quorum rules `{ minimumParticipants: number, minimumSuccessfulAgents: number }`.

### 2. Application Ports & Services (`src/application/swarm/ports/` & `services/`)

- **`SwarmOrchestratorPort`**: Interface `orchestrateSwarm(tenantContext, taskRequest, options?): Promise<SwarmConsensusResult>`.
- **`SwarmOrchestratorService`**: Stateless application service executing parallel worker agents and computing consensus.

---

## Compliance & Verification

- **ADR-009 / ADR-010**: Pure domain VOs, 0 framework dependencies.
- **ADR-018..ADR-023**: Preserves frozen runtime contracts, deterministic state machines, resilience decorators, and immutable planner cursors.
- **Contract Tests**: Verified by `swarm-orchestrator.contract.test.ts`.

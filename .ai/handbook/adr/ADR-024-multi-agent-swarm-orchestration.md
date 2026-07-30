# ADR-024: Multi-Agent Swarm Consensus, Delegation Topologies & Execution Isolation

- **Status**: Proposed
- **Date**: July 30, 2026
- **Authors**: Principal Software Architect & Core AI Engineering Team
- **Capability**: `capability-029` (Multi-Agent Swarm Orchestration)
- **Category**: `[ORCHESTRATION]` Multi-Agent Delegation, Consensus Aggregation & Concurrency Control

---

## Context & Problem Statement

`Capability-027` provided the Agent Execution Runtime and `Capability-028` provided the Autonomous Task Planner. `Capability-029` introduces **Multi-Agent Swarm Orchestration**, enabling specialized worker agents to execute delegated sub-tasks in parallel and form deterministic consensus.

Without strict architectural boundaries:

1. Agents might bypass `SwarmOrchestratorPort` and invoke peer tools directly or mutate shared global memory.
2. Parallel worker agents risk causing race conditions or resource exhaustion without concurrency bounds.
3. Non-deterministic consensus loops (e.g. LLM voting loops) lead to unpredictable latency and costs.

---

## Answers to the 10 Core Architectural Questions

### 1. Agent Identity & Lifecycle Ownership

- Agents are represented by immutable `AgentDescriptor` VOs (`agentId: AgentId`, `role: string`, `capabilities: string[]`) registered in `AgentRegistryPort`. Lifecycle is managed by `SwarmOrchestratorService`.

### 2. Delegation Topology

- Delegation is structured as a **DAG of Delegation Tasks** (`SwarmDelegationTask`). Circular agent-to-agent delegation loops (`AgentA -> AgentB -> AgentA`) are strictly forbidden and validated at plan delegation time.

### 3. Agent-to-Agent Communication Rule

- **Direct Agent-to-Agent Peer Calls are PROHIBITED**. All communication and sub-task delegation flows through `SwarmOrchestratorPort`. Zero peer tool invocation.

### 4. Deterministic Consensus Model

- Consensus aggregation uses deterministic domain strategies (`MajorityVoteConsensus`, `WeightedConfidenceConsensus`, `FirstSuccessConsensus`). Zero non-deterministic LLM voting loops.

### 5. Parallel Execution Budget & Concurrency Control

- Bound by `SwarmConcurrencyPolicy`:
  - `maxConcurrentAgents`: maximum parallel worker agents (default: 4).
  - `swarmTimeoutMs`: outer timeout limit for swarm execution (default: 30000ms).

### 6. Swarm Failure & Resiliency Policy

- Governed by `SwarmFailurePolicy`:
  - `QUORUM_DEGRADED_OK`: If minimum required agents succeed, consensus proceeds with degraded quorum.
  - `RETRY_AGENT`: Failed worker agent is retried up to agent budget.
  - `HALT_SWARM`: Fails the swarm task immediately.

### 7. Shared Context & Memory Ownership

- Workers receive immutable `ContextSnapshot` (from `Capability-026`). **Zero shared mutable memory buffer** exists between parallel worker agents.

### 8. Agent Output Confidence Model

- Every worker agent returns `SwarmAgentResult` carrying `{ agentId: AgentId, output: string, confidenceScore: number }` (0.0 to 1.0).

### 9. Relationship to Capability-028 (Planner)

- Planner (`Capability-028`) delegates complex sub-goals to `SwarmOrchestratorPort`. Swarm Orchestrator executes worker agents and returns aggregated consensus to Planner.

### 10. Boundary to Capability-027 (Runtime)

- Worker agents execute their workloads strictly via `ReasoningEnginePort.executeCycle(...)` (`Capability-027`). Swarm agents NEVER access `ToolDispatcherPort` or LLM provider decorators directly.

---

## Swarm Architecture Diagram

```text
Capability-028 (Autonomous Task Planner)
                 │
                 │ SwarmTaskRequest
                 ▼
Capability-029 (Multi-Agent Swarm Orchestrator)
                 │
                 ├── SwarmConcurrencyPolicy (maxConcurrentAgents = 4)
                 ├── SwarmDelegationTask (DAG Topology)
                 ├── SwarmAgentResult (confidenceScore: 0.0 - 1.0)
                 └── Deterministic Consensus Strategy (Majority / Weighted)
                 │
                 ├── Worker Agent 1 ──┐
                 ├── Worker Agent 2 ──┼──> ReasoningEnginePort.executeCycle(...)
                 └── Worker Agent 3 ──┘           (Capability-027 Runtime)
```

---

## Mandatory Non-Goals & Prohibitions

- ❌ **No Direct Tool Invocation by Swarm**: Swarm agents NEVER access `ToolDispatcherPort` or tool adapters directly.
- ❌ **No Peer-to-Peer Agent Calls**: Agents NEVER invoke other agents directly outside `SwarmOrchestratorPort`.
- ❌ **No Shared Mutable Memory**: Zero shared mutable state across worker agents.

---

## Proposed Component & Interface Layout for Capability-029

### 1. Domain & Value Objects (`src/domain/swarm/`)

- **`AgentDescriptor`**: Immutable agent definition `{ agentId: AgentId, role: string, capabilities: string[] }`.
- **`SwarmAgentResult`**: Immutable result `{ agentId: AgentId, output: string, confidenceScore: number }`.
- **`SwarmConsensusResult`**: Aggregated consensus output `{ finalOutput: string, aggregatedConfidence: number, participatingAgents: AgentId[] }`.

### 2. Application Ports & Services (`src/application/swarm/`)

- **`SwarmOrchestratorPort`**: Interface `orchestrateSwarm(tenantContext, taskRequest): Promise<SwarmConsensusResult>`.
- **`SwarmOrchestratorService`**: Application service executing parallel worker agents and computing consensus.

---

## Compliance & Verification

- **ADR-009 / ADR-010**: Pure domain VOs, 0 framework dependencies.
- **ADR-018..ADR-023**: Preserves frozen runtime contracts, deterministic state machines, resilience decorators, and immutable planner cursors.
- **Contract Tests**: Verified by `swarm-orchestrator.contract.test.ts`.

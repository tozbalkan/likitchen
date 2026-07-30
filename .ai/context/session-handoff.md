# Session Handoff & Platform Architecture State

**Architecture Version**: `v1.4.0` (Hardened Baseline)  
**Last Updated**: July 30, 2026  
**Repository**: `likitchen` (Agent Execution Substrate)  
**Active Capability**: `capability-027` (Agent Execution & Tool Invocation Runtime)  
**Active Iteration**: **Iteration 4 (Application Resilience & Retry Decorators)**  
**Current Step**: **Step 1 (Resilience Decorators & Circuit Breaker VOs)**  
**Next Step**: **Step 2 (Resilience Ports & Application Decorators)**

---

## 1. Metadata & Lifecycle Status

| Property                 | Value                                                   |
| ------------------------ | ------------------------------------------------------- |
| **Architecture Version** | `v1.4.0` (Hardened Baseline)                            |
| **ADR Baseline**         | ADR-000 through ADR-019 (All accepted)                  |
| **Frozen ADR List**      | ADR-000 to ADR-019 (Immutable)                          |
| **Active Capability**    | `capability-027`                                        |
| **Active Iteration**     | Iteration 4 (Application Resilience & Retry Decorators) |
| **Current Step**         | Step 1: Resilience Decorators & Circuit Breaker VOs     |
| **Next Step**            | Step 2: Resilience Ports & Application Decorators       |

---

## 2. Platform Capability Lifecycle Timeline

| Capability ID          | Name                             | Status          | Frozen Commit / Tag | Notes                                                         |
| ---------------------- | -------------------------------- | --------------- | ------------------- | ------------------------------------------------------------- |
| `capability-001`–`023` | Core Foundation Substrate        | **FROZEN**      | Baseline            | Identity, Telemetry, Config, Resilience                       |
| `capability-024`       | Workflow & Execution Graph       | **FROZEN**      | Commit `4bade7b`    | `ExecutionPlanInstance`, `ExecutionCursor`                    |
| `capability-025`       | Memory & Knowledge Platform      | **FROZEN**      | Commit `80781dc`    | Scoped Memory, CAS Superseding, Knowledge Snapshots           |
| `capability-026`       | Context & Decision Intelligence  | **FROZEN**      | Commit `e6ac9dc`    | `ContextSnapshot`, 11-step Pipeline, DEFERRED_TO_AGENT        |
| `capability-027` (I1)  | LLM Chat Completion Contract     | **FROZEN**      | Commit `36cb28d`    | `ChatCompletionPort`, VOs, `OpenAiChatCompletionAdapter`      |
| `capability-027` (I2)  | Tool Execution Port & Dispatcher | **FROZEN**      | Commit `613785f`    | `ToolExecutionPort`, `ToolRegistryPort`, `ToolDispatcherPort` |
| `capability-027` (I3)  | ReAct Reasoning Loop             | **FROZEN**      | Commit `f823ad0`    | `ReasoningEnginePort`, `ReActReasoningEngine`                 |
| `capability-027` (I4)  | Application Resilience & Retries | **IN PROGRESS** | Step 1 Planning     | Decorator retry policies                                      |
| `capability-027` (I5)  | Response Streaming & Accounting  | **PLANNED**     | —                   | Streaming chunks & token accounting                           |
| `capability-028`       | Autonomous Task Planner          | **PLANNED**     | —                   | Sub-goal planning                                             |
| `capability-029`       | Multi-Agent Swarm Orchestration  | **PLANNED**     | —                   | Swarm consensus & delegation                                  |

---

## 3. Runtime Invariants & Immutable Rules

- 🔒 **Dispatcher Immutability**: `ToolDispatcher` is an immutable application service. It cannot modify registry mappings during runtime execution.
- 🔒 **Bootstrap Registry Mutation**: `ToolRegistryPort` is mutated _only_ during bootstrap/IoC initialization, never inside request execution.
- 🔒 **LLM-Independent Tool Outputs**: `ToolResult` carries raw normalized output strings/data. Mapping to `LLMContentPart` belongs strictly to Reasoning Runtime (Iteration 3).
- 🔒 **Async-First Execution**: All tool executions return `Promise<ToolResult>` to support async HTTP, MCP, SSH, Docker, and shell backends.
- 🔒 **Zero Tool Selection in Dispatcher**: `ToolDispatcher` strictly dispatches matching `ToolInvocation` VOs. Tool selection logic belongs exclusively to Reasoning Loop (Iteration 3).
- 🔒 **Mandatory Tenant Context**: All port methods mandate `Readonly<TenantContext>` as their first parameter.

---

## 4. Active Architectural Decisions (ADR Summaries)

| ADR ID      | Title                      | Summary                                                                                                                          |
| ----------- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| **ADR-009** | Clean Architecture         | Strict unidirectional layer rules: `Shared → Domain → Application → Infrastructure → Bootstrap`.                                 |
| **ADR-010** | Pure Domain Core           | Domain entities and VOs use pure TypeScript with 0 external framework or ORM imports.                                            |
| **ADR-012** | Ports & Adapters           | Application depends exclusively on abstract interfaces (`Ports`); infrastructure implements `Adapters`.                          |
| **ADR-014** | Context Assembly Boundary  | Capability-026 is a composition layer; does not own retrieval, memory lifecycle, or execution state.                             |
| **ADR-015** | Authorization Preservation | `ContextAssembler` never directly accesses raw memory/knowledge repos; consumes authorized evaluation services.                  |
| **ADR-016** | Deterministic Context      | Defines static source priority, `DEFERRED_TO_AGENT` conflict preservation, and mandatory SHA-256 snapshots.                      |
| **ADR-017** | LLM Completion Contract    | Provider-agnostic `ChatCompletionPort`, `LLMResponse` choices array, `GenerationConfig`, and `AgentRuntimeError` hierarchy.      |
| **ADR-018** | Tool Invocation Boundary   | Split `ToolRegistryPort` (mutation/lookup) and `ToolDispatcherPort` (execution). Dispatcher is immutable with 0 selection logic. |

---

## 5. Dependency Rules & Clean Architecture Direction

```text
  [Bootstrap / IoC]
         │
         ▼
  [Infrastructure Adapters]  ────────► [Application Ports / Services]
                                                 │
                                                 ▼
                                        [Pure Domain Core]

Rules:
✔ Infrastructure ──► Application Ports (Allowed)
✔ Application    ──► Domain Core (Allowed)
✘ Application    ──► Infrastructure (FORBIDDEN)
✘ Domain         ──► Application / Infrastructure (FORBIDDEN)
```

---

## 6. Known Constraints & Non-Goals

1. **Frozen Isolation Guarantee**: Frozen capabilities (`024`, `025`, `026`, `027-I1`) cannot be modified without an explicit ADR exception (`pnpm check:frozen`).
2. **Dispatcher Non-Goals**: `ToolDispatcher` does **NOT** choose tools, retry failures, cache outputs, or format LLM messages.
3. **Stateless Infrastructure Adapters**: All LLM and tool adapters must be 100% stateless (no instance conversation history).

---

## 7. Open Questions & Pending Decisions

| Topic                                      | Status          | Target Iteration / Milestone            |
| ------------------------------------------ | --------------- | --------------------------------------- |
| **Tool Capability Discovery**              | Open Question   | Iteration 3 (Reasoning Router)          |
| **Streaming Tool Output (stdout/MCP)**     | Open Question   | Iteration 5 (Streaming)                 |
| **Cancellation Token Propagation**         | Open Question   | Iteration 3 (Reasoning Loop)            |
| **Telemetry & Cost Accounting Decorators** | Open Question   | Iteration 4 (Resilience & Decorators)   |
| **Outbox Event Bus & Projection Pipeline** | Blueprint Ready | Capability-030 (Observability Platform) |

---

## 8. Quality Gates & Verification Commands

| Quality Gate                    | Command                      | Passing Threshold                     |
| ------------------------------- | ---------------------------- | ------------------------------------- |
| **TypeScript Static Analysis**  | `pnpm typecheck`             | 0 errors                              |
| **ESLint Code Quality**         | `npx eslint src --quiet`     | 0 errors                              |
| **Vitest Test Suite**           | `npx vitest run`             | 247/247 tests passed (72 test files)  |
| **Dependency Cruiser Layering** | `npx dependency-cruiser src` | 0 violations (590 modules)            |
| **Frozen Capability Isolation** | `pnpm check:frozen`          | 0 lines changed in frozen directories |

---

## 9. Definition of Done (DoD) per Iteration

- [x] Implementation Plan created & reviewed
- [x] ADR drafted, reviewed & accepted
- [x] Pure Domain VOs & Error Hierarchy implemented with unit tests
- [x] Port interfaces & Application Services defined
- [x] Stateless Infrastructure Adapters implemented
- [x] IoC registration wired in bootstrap
- [x] Dedicated Contract Tests passing (100% pass)
- [x] 5 Automated Quality Gates passing (`typecheck`, `eslint`, `vitest`, `dependency-cruiser`, `check:frozen`)
- [x] Walkthrough document generated in `docs/architecture/`
- [x] Iteration baseline marked as **FROZEN**

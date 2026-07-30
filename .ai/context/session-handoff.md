# Session Handoff & Platform Architecture State

**Architecture Version**: `v1.2.0`  
**Last Updated**: July 30, 2026  
**Repository**: `likitchen` (Agent Execution Substrate)  
**Active Capability**: `capability-027` (Agent Execution & Tool Invocation Runtime)  
**Active Iteration**: **Iteration 2 (Tool Execution Port & Tool Dispatcher Boundary)**  
**Current Step**: **Step 2 (Ports Definition & ToolDispatcher Service)**  
**Next Step**: **Step 3 (Infrastructure Adapters: InMemoryToolRegistryAdapter, InMemoryToolExecutionAdapter)**

---

## 1. Metadata & Lifecycle Status

| Property                 | Value                                                                                                                  |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Architecture Version** | `v1.2.0`                                                                                                               |
| **ADR Baseline**         | ADR-000 through ADR-018 (All accepted)                                                                                 |
| **Frozen ADR List**      | ADR-000 to ADR-016 (Immutable)                                                                                         |
| **Active Capability**    | `capability-027`                                                                                                       |
| **Active Iteration**     | Iteration 2 (Tool Execution & Dispatcher Boundary)                                                                     |
| **Current Step**         | Step 2: Ports & Application Services (`ToolExecutionPort`, `ToolRegistryPort`, `ToolDispatcherPort`, `ToolDispatcher`) |
| **Next Step**            | Step 3: Infrastructure Adapters (`InMemoryToolRegistryAdapter`, `InMemoryToolExecutionAdapter`)                        |

---

## 2. Platform Capability Lifecycle Matrix

| Capability ID          | Name                             | Status          | Frozen Commit / Tag | Notes                                                    |
| ---------------------- | -------------------------------- | --------------- | ------------------- | -------------------------------------------------------- |
| `capability-001`–`023` | Core Foundation Substrate        | **FROZEN**      | Baseline            | Identity, Telemetry, Config, Resilience                  |
| `capability-024`       | Workflow & Execution Graph       | **FROZEN**      | Commit `4bade7b`    | `ExecutionPlanInstance`, `ExecutionCursor`               |
| `capability-025`       | Memory & Knowledge Platform      | **FROZEN**      | Commit `80781dc`    | Scoped Memory, CAS Superseding, Knowledge Snapshots      |
| `capability-026`       | Context & Decision Intelligence  | **FROZEN**      | Commit `e6ac9dc`    | `ContextSnapshot`, 11-step Pipeline, DEFERRED_TO_AGENT   |
| `capability-027` (I1)  | LLM Chat Completion Contract     | **COMPLETED**   | Commit `36cb28d`    | `ChatCompletionPort`, VOs, `OpenAiChatCompletionAdapter` |
| `capability-027` (I2)  | Tool Execution Port & Dispatcher | **IN PROGRESS** | Step 1 (`cfdd822`)  | `ToolDefinition`, `ToolInvocation`, `ToolResult`, Errors |
| `capability-027` (I3)  | ReAct Reasoning Loop             | **PLANNED**     | —                   | State machine reasoning cycle                            |
| `capability-027` (I4)  | Application Resilience & Retries | **PLANNED**     | —                   | Decorator retry policies                                 |
| `capability-027` (I5)  | Response Streaming & Accounting  | **PLANNED**     | —                   | Streaming chunks & token accounting                      |
| `capability-028`       | Autonomous Task Planner          | **PLANNED**     | —                   | Sub-goal planning                                        |
| `capability-029`       | Multi-Agent Swarm Orchestration  | **PLANNED**     | —                   | Swarm consensus & delegation                             |

---

## 3. Known Constraints & Non-Goals

1. **Frozen Isolation Guarantee**: Frozen capabilities (`024`, `025`, `026`, `027-I1`) cannot be modified without an explicit, approved ADR exception. Verified in CI via `pnpm check:frozen`.
2. **Dispatcher Non-Goals**: `ToolDispatcher` strictly executes invocations. It does **NOT**:
   - ❌ Choose which tool to invoke (owned by Reasoning Loop in Iteration 3).
   - ❌ Perform retries or fallbacks (owned by Resilience Decorators in Iteration 4).
   - ❌ Cache execution outputs (owned by Caching Substrate).
   - ❌ Transform outputs into LLM content parts (owned by Reasoning Loop in Iteration 3).
3. **Stateless Infrastructure Adapters**: All LLM and tool adapters must be 100% stateless (no instance conversation history or raw SDK leakage).
4. **Mandatory Tenant Context**: All port methods mandate `Readonly<TenantContext>` as their first parameter.

---

## 4. Pending Architectural Decisions

| Decision Topic                                  | Status           | Target Iteration / Milestone            |
| ----------------------------------------------- | ---------------- | --------------------------------------- |
| **`ProviderCapabilitiesResolverPort`**          | Deferred (YAGNI) | Iteration 3 (Reasoning Router)          |
| **Outbox Event Publisher & Event Bus Pipeline** | Blueprint Ready  | Capability-030 (Observability Platform) |
| **Tool Execution Streaming (MCP / stdout)**     | Deferred         | Iteration 5 (Streaming)                 |

---

## 5. Quality Gates & Verification Commands

| Quality Gate                    | Command                      | Passing Threshold                     |
| ------------------------------- | ---------------------------- | ------------------------------------- |
| **TypeScript Static Analysis**  | `pnpm typecheck`             | 0 errors                              |
| **ESLint Code Quality**         | `npx eslint src --quiet`     | 0 errors                              |
| **Vitest Test Suite**           | `npx vitest run`             | 247/247 tests passed (72 test files)  |
| **Dependency Cruiser Layering** | `npx dependency-cruiser src` | 0 violations (590 modules)            |
| **Frozen Capability Isolation** | `pnpm check:frozen`          | 0 lines changed in frozen directories |

---

## 6. Repository Structure & Bootstrap Entry Points

```text
src/
├── domain/                      # Pure domain entities, VOs & domain events (No external deps)
│   └── events/                  # DomainEvent, PlatformEvents, AggregateRoot
├── application/                 # Use cases, application services & ports
│   ├── identity/                # TenantContext, security boundaries
│   ├── context-intelligence/    # Capability-026 ContextAssembler & Pipeline
│   └── agent/                   # Capability-027 Execution Runtime
│       ├── errors/              # AgentRuntimeError, ProviderError, ToolExecutionError
│       ├── vo/                  # ModelDescriptor, LLMRequest, ToolInvocation, ToolResult
│       └── ports/               # ChatCompletionPort, ToolExecutionPort, ToolDispatcherPort
├── infrastructure/              # Concrete hexagonal adapters
│   ├── context-intelligence/    # InMemoryContextSnapshotAdapter, CharacterTokenEstimator
│   ├── events/                  # InMemoryDomainEventPublisher
│   └── agent/                   # OpenAiChatCompletionAdapter, InMemoryToolAdapter
└── bootstrap/                   # IoC ApplicationRegistry & Composition Root
    ├── composition-root.ts      # Assembly orchestrator & startup validator
    └── register-providers.ts    # Service & adapter registration
```

---

## 7. Definition of Done (DoD) per Iteration

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

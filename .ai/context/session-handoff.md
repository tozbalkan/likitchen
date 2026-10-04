# Session Handoff & Platform Architecture State

**Architecture Version**: `v1.4.0` (Hardened Baseline)  
**Last Updated**: October 4, 2026  
**Repository**: `likitchen` (Agent Execution Substrate & Production App)  
**Active Capability**: `capability-030` (Production Vertical Slice)  
**Active Iteration**: **Phase 3 — Sales Rep Dashboard (Supabase login, live leads, persisted takeover)**  
**Current Step**: **Phase 1 ingestion remediation complete (`5fa5c9e`); dashboard work starting**  
**Next Step**: **Dashboard login + live leads; Meta/OpenAI wiring blocked on client credentials**

---

## 1. Metadata & Lifecycle Status

| Property                 | Value                                          |
| ------------------------ | ---------------------------------------------- |
| **Architecture Version** | `v1.4.0` (Hardened Baseline)                   |
| **ADR Baseline**         | ADR-000 through ADR-024 (All accepted)         |
| **Frozen ADR List**      | ADR-000 to ADR-024 (Immutable)                 |
| **Active Capability**    | `capability-030`                               |
| **Active Iteration**     | Phase 3 — Sales Rep Dashboard                  |
| **Current Step**         | Phase 1 complete (`5fa5c9e`), Phase 3 starting |
| **Next Step**            | Dashboard login + live leads from Supabase     |

---

## 2. Platform Capability Lifecycle Timeline

| Capability ID          | Name                             | Status          | Frozen Commit / Tag | Notes                                                          |
| ---------------------- | -------------------------------- | --------------- | ------------------- | -------------------------------------------------------------- |
| `capability-001`–`023` | Core Foundation Substrate        | **FROZEN**      | Baseline            | Identity, Telemetry, Config, Resilience                        |
| `capability-024`       | Workflow & Execution Graph       | **FROZEN**      | Commit `4bade7b`    | `ExecutionPlanInstance`, `ExecutionCursor`                     |
| `capability-025`       | Memory & Knowledge Platform      | **FROZEN**      | Commit `80781dc`    | Scoped Memory, CAS Superseding, Knowledge Snapshots            |
| `capability-026`       | Context & Decision Intelligence  | **FROZEN**      | Commit `e6ac9dc`    | `ContextSnapshot`, 11-step Pipeline, DEFERRED_TO_AGENT         |
| `capability-027` (I1)  | LLM Chat Completion Contract     | **FROZEN**      | Commit `36cb28d`    | `ChatCompletionPort`, VOs, `OpenAiChatCompletionAdapter`       |
| `capability-027` (I2)  | Tool Execution Port & Dispatcher | **FROZEN**      | Commit `613785f`    | `ToolExecutionPort`, `ToolRegistryPort`, `ToolDispatcherPort`  |
| `capability-027` (I3)  | ReAct Reasoning Loop             | **FROZEN**      | Commit `f823ad0`    | `ReasoningEnginePort`, `ReActReasoningEngine`                  |
| `capability-027` (I4)  | Application Resilience & Retries | **FROZEN**      | Commit `2970a8a`    | `RetryChatCompletionDecorator`, `CircuitBreakerToolDecorator`  |
| `capability-027` (I5A) | Response Streaming & Metadata    | **FROZEN**      | Commit `19c8f18`    | `StreamingChatCompletionPort`, `ChatStreamChunk`               |
| `capability-027` (I5B) | Token Accounting & Normalization | **FROZEN**      | Commit `053d2e7`    | `StreamingChatResponse`, `TokenAccountingDecorator`            |
| `capability-028`       | Autonomous Task Planner          | **FROZEN**      | Commit `a8d214e`    | Sub-goal decomposition & immutable cursor                      |
| `capability-029`       | Multi-Agent Swarm Orchestration  | **FROZEN**      | Commit `0acfa2f`    | Multi-agent DAG consensus & isolation                          |
| `capability-030`       | Production Vertical Slice        | **IN PROGRESS** | Commit `5fa5c9e`    | Webhook + Supabase verified against real DB; dashboard pending |

---

## 2a. Product Delivery Roadmap (Capability-030)

Decided October 4, 2026 after the security & development audit: **no new platform capabilities** until the product loop works end to end — a real WhatsApp message is qualified by the bot, lands as a lead, and a sales rep sees it and can take over.

| Phase                         | Scope                                                                                                                                                                                             | Status                                                                                                                  |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **0. Cleanup**                | Next.js 16.3.8 (GHSA-vcvr-r3jv-pc5j), remove lint artifacts                                                                                                                                       | ✅ Done (`fc3fbec`, `5fa5c9e`)                                                                                          |
| **1. Working ingestion loop** | Conversation-before-message ordering (FK), `processed_at` retry semantics, all messages per payload, optimistic revision lock, tenant scoping, fail-closed config, real-Supabase integration test | ✅ Code done & verified against real Supabase. ⏳ Vercel deploy + Meta webhook wiring **blocked on client credentials** |
| **2. Bot conversation**       | Real follow-up questions instead of `Next step: <enum>`, TR/EN, takeover silences the bot, fast 200 + async processing                                                                            | ⏳ Pending                                                                                                              |
| **3. Sales rep dashboard**    | Supabase login, session refresh (`proxy.ts`), leads from DB, persisted takeover                                                                                                                   | 🔄 Active                                                                                                               |
| **4. Production hardening**   | Observability, nonce CSP, timeouts on OpenAI/Graph calls, PII retention, backups                                                                                                                  | ⏳ Pending                                                                                                              |
| **5. Pilot**                  | Live traffic with LI Kitchen & Bed                                                                                                                                                                | ⏳ Pending                                                                                                              |

**External blocker:** the US-based client creates the Meta app (WhatsApp test number, system user token, App Secret) and the OpenAI key under the business's own accounts, following `docs/setup/meta-ve-openai-kurulum-rehberi.md`. Accounts are not created on the client's behalf. Business verification and the production number are on Meta's timeline.

**Single-tenant phase:** `WHATSAPP_TENANT_ID=tenant-default`. The schema stays multi-tenant; a `phone_number_id → tenant_id` mapping is deferred until a second customer exists.

---

## 2b. Production Slice Runtime Facts

- **Webhook** (`src/app/api/webhooks/whatsapp/handlers.ts`): HMAC → `phone_number_id` check (mandatory) → rate limit → per message: `ensureConversation` → `recordInboundMessage` (`new` / `retry` / `already_processed`) → pipeline → `markMessageProcessed`. Any failure returns 500 so Meta retries unfinished messages; processed ones are skipped.
- **Persistence** (`SupabaseConversationRepository`): service-role key (bypasses RLS), therefore every query is filtered by the repository's tenant. Infrastructure errors throw (`SupabaseRequestError`) and are never mapped to `NOT_FOUND`. `save()` uses `revision=lt.N` as an optimistic lock; lead updates never touch `status` or `human_takeover`.
- **Dashboard auth** (`src/app/api/dashboard/leads/handlers.ts`): Supabase Auth session (cookie or Bearer) → ACTIVE `tenant_memberships` → `RolePermissionEvaluator` (ADMIN / OPERATOR / AUDITOR / VIEWER). The previous custom HMAC dashboard token and `JWT_SIGNING_KEY` were removed.
- **RLS** (`docs/db/schema.sql`): authenticated users read rows of tenants where they hold an ACTIVE membership; only ADMIN/OPERATOR may update leads. No custom JWT claims or session GUCs.
- **Frontend**: Vanilla Extract only (Tailwind removed), enforced by `pnpm check:frontend`.
- **Known gaps:** dashboard still reads an in-memory demo lead store; no login page or session refresh; bot reply text exposes the internal recommendation enum; webhook processes synchronously.

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

1. **Frozen Isolation Guarantee**: Frozen capabilities (`024`–`029`, see `.ai/capabilities/architecture-manifest.json`) cannot be modified without an explicit ADR exception (`pnpm check:frozen`). Capability-030 product code (conversation pipeline, persistence, webhook, dashboard) is not frozen.
2. **Dispatcher Non-Goals**: `ToolDispatcher` does **NOT** choose tools, retry failures, cache outputs, or format LLM messages.
3. **Stateless Infrastructure Adapters**: All LLM and tool adapters must be 100% stateless (no instance conversation history).

---

## 7. Open Questions & Pending Decisions

| Topic                                      | Status           | Target Iteration / Milestone             |
| ------------------------------------------ | ---------------- | ---------------------------------------- |
| **Tool Capability Discovery**              | Open Question    | Iteration 3 (Reasoning Router)           |
| **Streaming Tool Output (stdout/MCP)**     | Open Question    | Iteration 5 (Streaming)                  |
| **Cancellation Token Propagation**         | Open Question    | Iteration 3 (Reasoning Loop)             |
| **Telemetry & Cost Accounting Decorators** | Open Question    | Iteration 4 (Resilience & Decorators)    |
| **Outbox Event Bus & Projection Pipeline** | Blueprint Ready  | Capability-030 (Observability Platform)  |
| **Meta / OpenAI client credentials**       | Blocked (client) | Phase 1 close-out (Vercel + webhook)     |
| **Async webhook processing**               | Open Question    | Phase 2 (`after()` vs. queue)            |
| **Distributed rate limiting**              | Open Question    | Phase 4 (in-memory limiter per instance) |

---

## 8. Quality Gates & Verification Commands

| Quality Gate                    | Command                      | Passing Threshold                        |
| ------------------------------- | ---------------------------- | ---------------------------------------- |
| **TypeScript Static Analysis**  | `pnpm typecheck`             | 0 errors                                 |
| **ESLint Code Quality**         | `npx eslint src --quiet`     | 0 errors                                 |
| **Vitest Test Suite**           | `npx vitest run`             | 462 passed, 5 skipped (111 files)        |
| **Supabase Integration**        | `pnpm test:integration`      | 5/5 against real Supabase (`.env.local`) |
| **Dependency Cruiser Layering** | `npx dependency-cruiser src` | 0 violations (706 modules)               |
| **Frozen Capability Isolation** | `pnpm check:frozen`          | 0 lines changed in frozen directories    |
| **Frontend Constitution**       | `pnpm check:frontend`        | 0 violations                             |
| **Dependency Audit**            | `pnpm audit --prod`          | 0 known vulnerabilities                  |

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

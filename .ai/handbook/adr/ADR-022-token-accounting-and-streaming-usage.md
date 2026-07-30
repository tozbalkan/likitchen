# ADR-022: Token Accounting & Streaming Usage Lifecycle

- **Status**: Proposed
- **Date**: July 30, 2026
- **Authors**: Principal Software Architect & Core AI Engineering Team
- **Capability**: `capability-027` (Iteration 5B)
- **Category**: `[ACCOUNTING]` Token Usage Normalization & Streaming Result Lifecycle

---

## Context & Problem Statement

In Capability-027 Iteration 5B, the AI Agent platform requires provider-agnostic **Token Accounting & Usage Normalization**.

Without clear lifecycle boundaries:

1. Mixing pricing/cost math (currency, USD prices) into token accounting couples usage tracking to pricing policies that change frequently.
2. In streaming mode, `AsyncIterable<ChatStreamChunk>` carries real-time transport deltas. Polluting transport chunks with token usage DTOs couples transport to accounting.
3. Guessing missing token counts when a provider emits no usage creates false metrics.
4. Writing usage to databases or invoking billing APIs inside the decorator violates Single Responsibility and Clean Architecture.

---

## Decision Drivers

1. **Pure Token Accounting (`UsageBreakdown` VO)**:
   - Contains ONLY token counts: `promptTokens`, `completionTokens`, `totalTokens`, `cachedInputTokens?`, `reasoningTokens?`.
   - Contains ZERO `cost`, `price`, `currency`, or `billing` fields. Pricing is owned by `Capability-031` (PricingPolicy).
2. **Streaming Usage Result Wrapper (`StreamingChatResponse`)**:
   - To preserve `AsyncIterable<ChatStreamChunk>` without chunk pollution, streaming methods return a `StreamingChatResponse` wrapper:
     ```typescript
     export interface StreamingChatResponse {
       readonly metadata: StreamMetadata;
       readonly stream: AsyncIterable<ChatStreamChunk>;
       readonly getUsage(): Promise<UsageBreakdown | undefined>;
     }
     ```
   - `getUsage()` resolves upon stream completion when the terminal `FinishChunk` is consumed.
3. **Explicit Handling of Unavailable Usage**:
   - If a provider or stream emits no usage, `getUsage()` resolves to `undefined`. The system NEVER fabricates or guesses token counts.
4. **Provider-Agnostic `UsageNormalizer`**:
   - `UsageNormalizer` maps raw vendor DTOs (OpenAI, Anthropic, Gemini) into normalized domain `UsageBreakdown` VOs.
5. **Zero Side-Effects Decorator (`TokenAccountingDecorator`)**:
   - `TokenAccountingDecorator` extracts, normalizes, and attaches token usage. It performs 0 database writes, 0 billing API calls, and 0 out-of-band telemetry.

---

## Component & Lifecycle Diagram

```text
Unary Lifecycle (ChatCompletionPort):
Request ──> TokenAccountingDecorator ──> Adapter ──> LLMResponse (with normalized usage)

Streaming Lifecycle (StreamingChatCompletionPort):
Request ──> TokenAccountingDecorator ──> Adapter ──> StreamingChatResponse
                                                          │
                                                          ├── stream: AsyncIterable<ChatStreamChunk>
                                                          └── getUsage(): Promise<UsageBreakdown | undefined>
```

---

## Proposed Interface Layout for Iteration 5B

### 1. Domain & Value Objects (`src/application/agent/vo/`)

- **`UsageBreakdown`**: Pure accounting VO `{ promptTokens: number, completionTokens: number, totalTokens: number, cachedInputTokens?: number, reasoningTokens?: number }`.
- **`StreamingChatResponse`**: Result wrapper `{ metadata: StreamMetadata, stream: AsyncIterable<ChatStreamChunk>, getUsage(): Promise<UsageBreakdown | undefined> }`.

### 2. Application Service & Decorator (`src/application/agent/services/` & `decorators/`)

- **`UsageNormalizer`**: Standardized mapper converting raw provider usage objects into `UsageBreakdown`.
- **`TokenAccountingDecorator`**: Non-intrusive decorator wrapping `ChatCompletionPort` and `StreamingChatCompletionPort`.

---

## Compliance & Verification

- **ADR-009 / ADR-010**: Pure domain VOs, 0 framework dependencies.
- **ADR-018..ADR-021**: Preserves immutable dispatchers, deterministic state machine boundaries, resilience decorators, and streaming chunk contracts.
- **Contract Tests**: Verified by `token-accounting.contract.test.ts`.

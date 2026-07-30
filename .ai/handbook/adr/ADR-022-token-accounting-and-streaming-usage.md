# ADR-022: Token Accounting & Streaming Usage Lifecycle

- **Status**: Accepted
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
3. Treating stream errors (`FAILED`) or early consumer cancellation (`CANCELLED`) as `UNAVAILABLE` (`undefined`) masks failures during debugging and accounting audits.
4. Overloading a single decorator with both unary and streaming completion logic creates branching complexity (`if (streaming)`).

---

## Decision Drivers

1. **Pure Token Accounting (`UsageBreakdown` VO)**:
   - Contains ONLY token counts: `promptTokens`, `completionTokens`, `totalTokens`, `cachedInputTokens?`, `reasoningTokens?`.
   - Contains ZERO `cost`, `price`, `currency`, or `billing` fields. Pricing is owned by `Capability-031` (PricingPolicy).
2. **Explicit Streaming Usage Lifecycle (`PENDING | AVAILABLE | UNAVAILABLE | CANCELLED | FAILED`)**:
   - Streaming result wrapper `StreamingChatResponse` tracks usage lifecycle:
     - `PENDING`: Stream is currently active.
     - `AVAILABLE`: Normal completion with token usage -> `getUsage()` resolves to `UsageBreakdown`.
     - `UNAVAILABLE`: Normal completion without token usage -> `getUsage()` resolves to `undefined`.
     - `CANCELLED`: Stream aborted or consumer `break` early -> `getUsage()` rejects with cancellation error or resolves to `undefined`.
     - `FAILED`: Stream encountered network/provider exception -> `getUsage()` rejects with the underlying error.
3. **Application Transport Abstraction (`StreamingChatResponse`)**:
   - `StreamingChatResponse` is located in `src/application/agent/ports/streaming-chat-response.ts` as an application result abstraction (NOT a Value Object).
4. **Dedicated Unary & Streaming Decorators**:
   - `TokenAccountingChatCompletionDecorator` wraps `ChatCompletionPort`.
   - `TokenAccountingStreamingDecorator` wraps `StreamingChatCompletionPort`.
5. **Infrastructure Boundary Mapping**:
   - Infrastructure adapters parse raw vendor DTOs (`prompt_tokens`, `completion_tokens`) and emit normalized `UsageBreakdown` domain VOs. Zero vendor DTOs leak into the Application layer.
6. **Zero Side-Effects Decorators**:
   - Token accounting decorators compute and attach normalized usage. They perform 0 database writes, 0 billing API calls, and 0 out-of-band telemetry.

---

## Component & Lifecycle Diagram

```text
Unary Lifecycle:
Request ──> TokenAccountingChatCompletionDecorator ──> Adapter ──> LLMResponse (with normalized usage)

Streaming Lifecycle:
Request ──> TokenAccountingStreamingDecorator ──> Adapter ──> StreamingChatResponse
                                                                  │
                                                                  ├── stream: AsyncIterable<ChatStreamChunk>
                                                                  └── getUsage(): Promise<UsageBreakdown | undefined>
                                                                        └── Lifecycle: PENDING -> (AVAILABLE | UNAVAILABLE | CANCELLED | FAILED)
```

---

## Proposed Component & Interface Layout for Iteration 5B

### 1. Value Objects (`src/application/agent/vo/`)

- **`UsageBreakdown`**: Pure accounting VO `{ promptTokens: number, completionTokens: number, totalTokens: number, cachedInputTokens?: number, reasoningTokens?: number }`.

### 2. Application Ports & Transport Abstraction (`src/application/agent/ports/`)

- **`StreamingChatResponse`**: Transport result wrapper interface `{ metadata: StreamMetadata, stream: AsyncIterable<ChatStreamChunk>, getUsage(): Promise<UsageBreakdown | undefined> }`.

### 3. Application Decorators (`src/application/agent/decorators/`)

- **`TokenAccountingChatCompletionDecorator`**: Wraps `ChatCompletionPort`.
- **`TokenAccountingStreamingDecorator`**: Wraps `StreamingChatCompletionPort`.

---

## Compliance & Verification

- **ADR-009 / ADR-010**: Pure domain VOs, 0 framework dependencies.
- **ADR-018..ADR-021**: Preserves immutable dispatchers, deterministic state machine boundaries, resilience decorators, and streaming chunk contracts.
- **Contract Tests**: Verified by `token-accounting.contract.test.ts` (including early consumer loop `break` and stream error rejection).

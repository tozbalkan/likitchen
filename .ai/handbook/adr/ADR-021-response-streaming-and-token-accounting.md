# ADR-021: Response Streaming Abstraction & Token Accounting Decorators

- **Status**: Proposed
- **Date**: July 30, 2026
- **Authors**: Principal Software Architect & Core AI Engineering Team
- **Capability**: `capability-027` (Iteration 5A & 5B)
- **Category**: `[STREAMING & ACCOUNTING]` Response Streaming & Token Usage Normalization

---

## Context & Problem Statement

In Capability-027 Iteration 5, the AI Agent platform requires **Real-Time Response Streaming** (5A) and **Provider-Agnostic Token Usage Accounting** (5B).

Without clean architectural boundaries:

1. Creating a disconnected streaming port risks duplicating `LLMRequest` / prompt serialization logic across provider adapters.
2. Squeezing transient transport stream chunks into `ReasoningStep` pollutes the deterministic state machine history with network-level events.
3. Embedding token calculation or billing logic inside `ReActReasoningEngine` violates Single Responsibility and Clean Architecture.
4. Vendor-specific token usage payloads (OpenAI vs Anthropic vs Gemini DTOs) risk leaking into application services.

---

## Decision Drivers

1. **Unified Request Contract**: Both `ChatCompletionPort` and `StreamingChatCompletionPort` accept the same provider-agnostic `LLMRequest` VO and `ChatCompletionOptions`.
2. **Strict Division of Iteration 5**:
   - **Iteration 5A (Response Streaming)**: Defines `StreamingChatCompletionPort`, `ChatStreamChunk` VO, and `AsyncIterable` stream processing driven by `AbortSignal`.
   - **Iteration 5B (Token Accounting)**: Defines `TokenUsageAccountingDecorator` and normalized `UsageBreakdown` extraction without side effects (no DB writes or billing side-effects).
3. **No Streaming State in `ReasoningStep`**: Transport stream chunks exist strictly at the transport layer (`AsyncIterable<ChatStreamChunk>`). `ReasoningStep` records only completed steps and actions.
4. **Immutable `ChatStreamChunk` VO**: Stream chunks carry `{ chunkId: string, index: number, delta: string, finishReason?: string, timestamp: Instant }` and are deeply frozen.
5. **Unified Cancellation via `AbortSignal`**: Streaming cancellation relies 100% on standard `AbortSignal` (`options.signal`). Zero redundant `stop()` or `cancel()` methods.
6. **Zero Side-Effect Accounting**: `TokenAccountingDecorator` computes and attaches normalized `UsageBreakdown` without DB writes or out-of-band telemetry.

---

## Streaming Pipeline Diagram (Iteration 5A)

```text
Caller / UI Listener
  │
  ├── completeStream(tenantContext, request, options): AsyncIterable<ChatStreamChunk>
  │
  └── ReAct Reasoning Engine (Consumes chunks, evaluates complete LLMResponse)
```

---

## Decorator Pipeline Diagram (Iteration 5B)

```text
Chat Completion Pipeline:
ChatCompletionPort -> TokenAccountingDecorator -> RetryChatCompletionDecorator -> OpenAiChatCompletionAdapter
```

---

## Proposed Component & Interface Layout

### Iteration 5A: Response Streaming (`src/application/agent/`)

- **`ChatStreamChunk`**: Value Object containing `{ chunkId: string, index: number, delta: string, finishReason?: string, timestamp: Instant }`.
- **`StreamingChatCompletionPort`**: Interface `completeStream(tenantContext, request, options?): AsyncIterable<ChatStreamChunk>`.

### Iteration 5B: Token Accounting (`src/application/agent/`)

- **`TokenUsageAccountingDecorator`**: Implements `ChatCompletionPort` / `StreamingChatCompletionPort`, extracting and normalizing token usage.

---

## Non-Goals

- ❌ **No Stream Chunks in ReasoningStep**: `ReasoningStep` contains 0 stream chunk arrays.
- ❌ **No Token Math in Engine**: `ReActReasoningEngine` contains 0 token calculation or pricing code.
- ❌ **No DB / Billing Side-Effects**: `TokenAccountingDecorator` performs 0 database writes.

---

## Compliance & Verification

- **ADR-009 / ADR-010**: Pure domain VOs, 0 framework dependencies.
- **ADR-018 / ADR-019 / ADR-020**: Preserves immutable dispatchers, deterministic state machine boundaries, and resilience decorators.
- **Contract Tests**: Verified by `streaming-and-accounting.contract.test.ts`.

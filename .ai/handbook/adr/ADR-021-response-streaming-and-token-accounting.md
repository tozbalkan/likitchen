# ADR-021: Response Streaming Abstraction & Token Accounting Decorators

- **Status**: Accepted
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
3. Modeling stream chunks as flat `delta: string` strings prevents incremental tool-call streaming in future provider adapters.
4. Embedding token calculation or billing logic inside `ReActReasoningEngine` violates Single Responsibility and Clean Architecture.

---

## Decision Drivers

1. **Shared Base Contract (`BaseChatCompletionPort`)**: Both `ChatCompletionPort` and `StreamingChatCompletionPort` extend a common base contract to share `LLMRequest` validation and model descriptor handling across provider adapters.
2. **Discriminated Union `ChatStreamChunk`**: Stream chunks are modeled as an extensible discriminated union (`TextDeltaChunk | ToolCallDeltaChunk | FinishChunk`):
   - `TextDeltaChunk`: `{ type: 'text_delta', chunkId: string, index: number, text: string, timestamp: Instant }`.
   - `ToolCallDeltaChunk`: `{ type: 'tool_call_delta', chunkId: string, index: number, callId: string, toolId: ToolId, argumentsDelta: string, timestamp: Instant }`.
   - `FinishChunk`: `{ type: 'finish', chunkId: string, index: number, finishReason: StreamFinishReason, usage?: UsageBreakdown, timestamp: Instant }`.
3. **Monotonic Chunk Indexing**: Chunk `index` starts at 0 and increments strictly monotonically (`0, 1, 2, 3...`) across the entire stream lifecycle.
4. **Normalized `StreamFinishReason`**: Vendor finish reasons are normalized at adapter boundary into `'STOP' | 'LENGTH' | 'CONTENT_FILTER' | 'TOOL_CALL' | 'ERROR'`.
5. **Pure AsyncIterable Stream API**: `completeStream(...)` returns `AsyncIterable<ChatStreamChunk>` driven exclusively by `options.signal` (`AbortSignal`). Zero callbacks, subscriptions, or EventEmitters.
6. **Separation of Iterations (5A & 5B)**:
   - **Iteration 5A (Response Streaming)**: Focuses on `StreamingChatCompletionPort`, `ChatStreamChunk` VOs, `StreamMetadata`, and `AsyncIterable` stream processing.
   - **Iteration 5B (Token Accounting)**: Focuses on `TokenAccountingDecorator` wrapping both unary and streaming completion ports without DB writes or billing side-effects.

---

## Component Architecture — Shared Contract & Decorators

```text
[BaseChatCompletionPort]
      │
      ├── [ChatCompletionPort] ──> complete(tenant, request, options): Promise<LLMResponse>
      │
      └── [StreamingChatCompletionPort] ──> completeStream(tenant, request, options): AsyncIterable<ChatStreamChunk>
```

---

## Proposed Component & Interface Layout

### Iteration 5A: Response Streaming (`src/application/agent/`)

- **`StreamFinishReason`**: `'STOP' | 'LENGTH' | 'CONTENT_FILTER' | 'TOOL_CALL' | 'ERROR'`.
- **`ChatStreamChunk`**: Discriminated union (`TextDeltaChunk | ToolCallDeltaChunk | FinishChunk`).
- **`StreamMetadata`**: Value Object `{ streamId: string, model: ModelDescriptor, startedAt: Instant }`.
- **`BaseChatCompletionPort`**: Base port for common LLM completion operations.
- **`StreamingChatCompletionPort`**: Extension port offering `completeStream(...)`.

### Iteration 5B: Token Accounting (`src/application/agent/`)

- **`TokenAccountingDecorator`**: Non-intrusive decorator wrapping both `ChatCompletionPort` and `StreamingChatCompletionPort`.

---

## Compliance & Verification

- **ADR-009 / ADR-010**: Pure domain VOs, 0 framework dependencies.
- **ADR-018 / ADR-019 / ADR-020**: Preserves immutable dispatchers, deterministic state machine boundaries, and resilience decorators.
- **Contract Tests**: Verified by `streaming.contract.test.ts` (5A) and `token-accounting.contract.test.ts` (5B).

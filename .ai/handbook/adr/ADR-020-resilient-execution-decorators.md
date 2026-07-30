# ADR-020: Resilient Execution Decorators & Timeout Hierarchy

- **Status**: Proposed
- **Date**: July 30, 2026
- **Authors**: Principal Software Architect & Core AI Engineering Team
- **Capability**: `capability-027` (Iteration 4)
- **Category**: `[RESILIENCE]` Decorator Policies & Execution Hardening

---

## Context & Problem Statement

In Capability-027 Iteration 4, the AI Agent platform requires transparent **Application Resilience** (retry logic and circuit breaking).

Without non-intrusive decorator boundaries:

1. Retry logic, loop checks, and backoff code risk leaking into the `ReActReasoningEngine` or `ToolDispatcher`, violating SRP and Clean Architecture.
2. Retries could incorrectly increment `ReasoningStep` counts or interfere with outer execution step budgets.
3. Overlapping timeouts (Reasoning, LLM HTTP, Tool Execution) cause uncoordinated race conditions.
4. Infrastructure-specific circuit breaker states (`OPEN`, `HALF_OPEN`) risk leaking into domain `ReasoningState`.

---

## Decision Drivers

1. **Non-Intrusive Decorator Pattern**: Retries and circuit breaking are implemented strictly via Decorator wrapping:
   - `ChatCompletionPort` -> `RetryChatCompletionDecorator` -> `OpenAiChatCompletionAdapter`.
   - `ToolExecutionPort` -> `CircuitBreakerToolDecorator` -> `InMemoryToolExecutionAdapter`.
   - `ReActReasoningEngine` and `ToolDispatcher` remain 100% unaware of resilience decorators.
2. **Strict Retry vs. Step Budget Separation**: Retries happen _inside_ an in-flight adapter attempt. Retries do **NOT** increment `ReasoningStep.stepIndex`.
3. **Explicit Timeout Hierarchy**:
   - `Reasoning Cycle Timeout` (Outer limit, e.g. 60,000ms — enforced by `ReasoningLoopGuard`).
   - `LLM Completion Timeout` (Per-LLM call limit, e.g. 15,000ms — enforced by `ChatCompletionOptions.timeoutMs`).
   - `Tool Execution Timeout` (Per-tool limit, e.g. 5,000ms — enforced by `ToolExecutionPort`).
4. **Zero Circuit Breaker Domain Leakage**: Circuit Breaker state (`CLOSED`, `OPEN`, `HALF_OPEN`) remains strictly inside the infrastructure decorator. When `OPEN`, the decorator throws `ToolUnavailableError` (an `AgentRuntimeError`).
5. **Deterministic Backoff (Zero `Math.random()`)**: Backoff policies use deterministic calculations (`ConstantBackoff`, `ExponentialBackoff`, `FakeBackoff`).
6. **In-Memory Circuit Breaker**: State is tracked strictly in-memory per adapter instance (YAGNI on distributed state).

---

## Timeout Hierarchy Diagram

```text
[Reasoning Loop Execution - Outer Limit e.g. 60s]
  │
  ├── Step 1: Prompt LLM [Chat Completion Timeout e.g. 15s]
  │     ├── Try 1 (Fails: HTTP 503)
  │     ├── Backoff 100ms
  │     └── Try 2 (Succeeds)
  │
  └── Step 2: Execute Tool [Tool Execution Timeout e.g. 5s]
        └── Attempt 1 (Succeeds in 200ms)
```

---

## Proposed Component & Decorator Layout

### 1. Resilience Policies & Value Objects

- **`BackoffPolicy`**: Strategy interface (`getDelayMs(attempt: number): number`).
  - `ConstantBackoff`: `{ delayMs: number }`.
  - `ExponentialBackoff`: `{ initialDelayMs: number, multiplier: number, maxDelayMs: number }`.
  - `FakeBackoff`: `{ staticDelayMs: 0 }` for deterministic unit testing.
- **`RetryPolicy`**: Value Object containing `{ maxAttempts: number, backoff: BackoffPolicy }`.
- **`CircuitBreakerPolicy`**: Value Object containing `{ failureThreshold: number, resetTimeoutMs: number }`.

### 2. Application Decorators

- **`RetryChatCompletionDecorator`**: Implements `ChatCompletionPort`, wrapping an inner `ChatCompletionPort`.
- **`CircuitBreakerToolDecorator`**: Implements `ToolExecutionPort`, wrapping an inner `ToolExecutionPort`.

---

## Non-Goals

- ❌ **No Retry in Reasoning Engine**: `ReActReasoningEngine` contains 0 retry loops.
- ❌ **No Circuit Breaker Domain States**: `ReasoningState` has 0 circuit breaker states.
- ❌ **No Random Jitter**: Zero `Math.random()` in backoff algorithms.

---

## Compliance & Verification

- **ADR-009 / ADR-010**: Pure domain VOs, 0 framework dependencies.
- **ADR-018 / ADR-019**: Preserves immutable dispatchers and deterministic state machine boundaries.
- **Contract Tests**: Verified by `resilience-decorators.contract.test.ts`.

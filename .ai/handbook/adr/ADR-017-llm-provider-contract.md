# ADR-017: Unified LLM Chat Completion Contract

- **Status**: Accepted
- **Date**: July 30, 2026
- **Authors**: Principal Software Architect & Core Engineering Team
- **Capability**: `capability-027` (Iteration 1)
- **Category**: `[AI]` AI Provider Separation & Contract Boundaries

---

## Context & Problem Statement

As the platform evolves across Capabilities 027 to 030, multiple Large Language Model (LLM) providers (OpenAI, Anthropic, Gemini, Azure OpenAI, Ollama, vLLM, LiteLLM) will be integrated.

Without a strictly defined, provider-agnostic `ChatCompletionPort` contract:

1. Infrastructure provider details (e.g. OpenAI `choices`, Anthropic `content` blocks, Gemini `candidates`) will leak into application and reasoning loop logic.
2. Assuming single-message responses breaks multi-candidate completion (`n > 1`, self-consistency, candidate ranking).
3. Raw HTTP/SDK errors (e.g., `AxiosError`, `APIError`) leak into application layers without retryability classification.
4. Embedding capabilities inside static model descriptors causes false assumptions when deployments or model versions change.

---

## Decision Drivers

1. **Provider & Vendor Independence**: Application and domain layers must be 100% agnostic to concrete LLM vendors.
2. **Multi-Output Ready**: `LLMResponse` contains an array of choices (`choices: ReadonlyArray<LLMChoice>`) to support multi-candidate generation.
3. **Structured Generation Config**: Hyperparameters are grouped inside a dedicated `GenerationConfig` VO.
4. **Hierarchical Runtime Error Hierarchy**: All runtime errors derive from `AgentRuntimeError` (`ProviderError`, `ResponseValidationError`, `ContextWindowExceededError`).
5. **Runtime Capability Resolution**: Model capabilities are resolved dynamically via `ProviderCapabilitiesResolver` port, keeping `ModelDescriptor` pure.
6. **Deep Immutability**: All request/response VOs (`LLMMessage`, `LLMRequest`, `LLMResponse`, `GenerationConfig`, `UsageBreakdown`) must be deeply immutable (`Object.freeze`).

---

## Proposed Decision

We accept a unified, provider-agnostic domain contract with the following Value Objects, Domain Errors, and Port interfaces:

### 1. Model Identification & Capabilities

- **`ProviderId`**: Nominal brand string alias (`Brand<string, 'ProviderId'>`).
- **`ModelId`**: Nominal brand string alias (`Brand<string, 'ModelId'>`).
- **`ModelDescriptor`**: Value Object containing `{ providerId: ProviderId, modelId: ModelId, deploymentName?: string }`.
- **`ModelCapabilities`**: Value Object containing `{ supportsTools: boolean, supportsStreaming: boolean, supportsVision: boolean, supportsReasoning: boolean, supportsJsonMode: boolean }`.
- **`ProviderCapabilitiesResolver` Port**: `resolveCapabilities(model: ModelDescriptor): Promise<ModelCapabilities>`.

### 2. Message & Multimodal Content Structure

- **`LLMRole`**: Union string type (`'system' | 'user' | 'assistant'`).
- **`LLMTextContentPart`**: `{ type: 'text', text: string }`.
- **`LLMContentPart`**: Discriminated union of content parts (Iteration 1: `LLMTextContentPart`).
- **`LLMMessage`**: Value Object containing `role: LLMRole`, `parts: ReadonlyArray<LLMContentPart>`, and getter `textContent: string`.

### 3. Generation Config, Choice & Execution Response VOs

- **`GenerationConfig`**: Value Object carrying `temperature?`, `topP?`, `seed?`, `maxTokens?`, `candidateCount?`, `stopSequences?`.
- **`LLMRequest`**: Value Object carrying:
  - `model: ModelDescriptor`
  - `systemMessages: ReadonlyArray<LLMMessage>`
  - `messages: ReadonlyArray<LLMMessage>`
  - `config: GenerationConfig`
- **`FinishReason`**: Union type (`'stop' | 'length' | 'tool_call' | 'content_filter' | 'cancelled' | 'timeout' | 'error' | 'unknown'`).
- **`LLMChoice`**: Value Object containing `index: number`, `message: LLMMessage`, `finishReason: FinishReason`.
- **`UsageBreakdown`**: Value Object carrying `promptTokens`, `completionTokens`, `totalTokens`, and optional `cachedTokens?`, `reasoningTokens?`.
- **`LLMResponse`**: Value Object carrying `id`, `model`, `choices`, `usage`, `providerRequestId?`, `createdAt`.
  - Getter `primaryChoice`: Returns `choices[0]`. Throws `ResponseValidationError` if `choices` is empty.

### 4. Hierarchical Error Abstraction

- **`AgentRuntimeError`**: Base domain error class extending `Error`.
- **`ProviderErrorCategory`**: `'rate_limit' | 'authentication' | 'invalid_request' | 'context_length_exceeded' | 'timeout' | 'service_unavailable' | 'unknown'`.
- **`ProviderError`**: Extends `AgentRuntimeError` (`providerId`, `category`, `retryable: boolean`, `statusCode?`, `originalMessage`).
- **`ResponseValidationError`**: Extends `AgentRuntimeError` (thrown when provider response shape or mapping fails).

### 5. Primary Application Port

- **`ChatCompletionOptions`**: `{ readonly signal?: AbortSignal }`.
- **`ChatCompletionPort`**:
  ```typescript
  export interface ChatCompletionPort {
    complete(
      tenantContext: Readonly<TenantContext>,
      request: Readonly<LLMRequest>,
      options?: Readonly<ChatCompletionOptions>,
    ): Promise<LLMResponse>;
  }
  ```

---

## Consequences

### Positive

- **Future-Proof Hyperparameters**: Adding parameters to `GenerationConfig` won't break `LLMRequest` signatures.
- **Dynamic Capabilities**: Capabilities resolved at runtime via port, preventing static assumption bugs.
- **Unified Error Handling**: Catching `AgentRuntimeError` handles provider failures, validation issues, and context limits uniformly.

---

## Compliance & Verification

- **Pure Domain Rules (ADR-010)**: 0 external framework dependencies in domain VOs and errors.
- **Tenant Isolation (ADR-001)**: `complete()` accepts `Readonly<TenantContext>` as its first parameter.
- **Contract Tests**: Verified by `chat-completion.contract.test.ts`.

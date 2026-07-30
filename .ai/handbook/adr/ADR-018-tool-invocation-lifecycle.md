# ADR-018: Tool Invocation Lifecycle & Dispatcher Boundary

- **Status**: Accepted
- **Date**: July 30, 2026
- **Authors**: Principal Software Architect & Core Engineering Team
- **Capability**: `capability-027` (Iteration 2)
- **Category**: `[TOOL]` Tool Platform & Execution Boundary

---

## Context & Problem Statement

In Capability-027 Iteration 2, the AI Agent platform requires a deterministic, provider-agnostic **Tool Invocation Runtime**.

Without clear boundaries for tool execution:

1. Tool selection logic (choosing _which_ tool to run) may leak into execution dispatchers, violating SRP.
2. Mixing registry mutation (`registerAdapter`) into the dispatcher interface breaks immutability during production execution.
3. Heterogeneous tool backends (HTTP endpoints, MCP servers, local shell utilities, browser automation) produce un-normalized arguments and raw vendor exceptions.
4. Coupling `ToolResult` to LLM message formats (`LLMContentPart`) leaks AI transport details into generic tool execution components.

---

## Decision Drivers

1. **SRP Registry & Dispatcher Separation**: Tool registration (`ToolRegistryPort`) is strictly separated from runtime dispatching (`ToolDispatcherPort`). Dispatchers are immutable application services.
2. **Dispatcher Boundary (Zero Selection Logic)**: `ToolDispatcher` strictly accepts a `ToolInvocation` VO and dispatches it to the registered `ToolExecutionPort`. Selection logic belongs exclusively to the Reasoning Loop (Iteration 3).
3. **Async-First Execution**: All tool executions return `Promise<ToolResult>` to accommodate async HTTP, Docker, SSH, and MCP tool invocations.
4. **Structured Tool Value Objects**:
   - `ToolArguments` VO encapsulating raw arguments and validation accessors.
   - `ToolSchema` VO encapsulating schema specifications (`json_schema`).
   - `ToolDefinition` VO encapsulating `toolId`, `displayName`, `description`, `version`, `inputSchema`, `executionMode`.
5. **Decoupled Tool Outputs**: `ToolResult` carries raw normalized output strings/data. Mapping `ToolResult` into `LLMToolResultContentPart` belongs strictly to the Reasoning Runtime (Iteration 3).
6. **Hierarchical Tool Errors**: Tool execution failures throw structured `ToolExecutionError` domain objects derived from `AgentRuntimeError` (`ToolTimeoutError`, `ToolValidationError`, `ToolPermissionError`, `ToolUnavailableError`).
7. **Deep Immutability**: All invocation VOs (`ToolInvocation`, `ToolResult`, `ToolDefinition`, `ToolArguments`, `ToolSchema`) are deeply immutable (`Object.freeze`).

---

## Non-Goals (Explicitly Out of Scope for Dispatcher)

The `ToolDispatcher` strictly executes invocations. It does **NOT**:

- ❌ Choose which tool to invoke (owned by Reasoning Loop in Iteration 3).
- ❌ Perform automatic retries or fallbacks (owned by Resilience Decorators in Iteration 4).
- ❌ Cache execution outputs (owned by Caching Substrate).
- ❌ Transform outputs into LLM message content parts (owned by Reasoning Loop in Iteration 3).

---

## Proposed Decision

We accept a unified tool execution contract with the following Value Objects, Domain Errors, and Port interfaces:

### 1. Domain Value Objects

- **`ToolId`**: Nominal brand string alias (`Brand<string, 'ToolId'>`).
- **`InvocationId`**: Nominal brand string alias (`Brand<string, 'InvocationId'>`).
- **`ToolExecutionMode`**: Union type (`'local' | 'http' | 'mcp' | 'browser' | 'shell'`).
- **`ToolSchema`**: Value Object containing `{ format: 'json_schema', rawSchema: Readonly<Record<string, unknown>> }`.
- **`ToolArguments`**: Value Object containing `{ rawJson: Readonly<Record<string, unknown>>, get<T>(key): T, toJson(): string }`.
- **`ToolDefinition`**: Value Object containing `{ toolId: ToolId, displayName: string, description: string, version: string, inputSchema: ToolSchema, executionMode: ToolExecutionMode, outputSchema?: ToolSchema }`.
- **`ToolInvocation`**: Value Object containing `{ invocationId: InvocationId, toolId: ToolId, arguments: ToolArguments, startedAt: Instant, correlationId: CorrelationId }`.
- **`ToolResult`**: Value Object containing `{ invocationId: InvocationId, toolId: ToolId, status: 'success' | 'failure', output: string, executionTimeMs: number, createdAt: Instant }`.

### 2. Polymorphic LLM Content Parts (Iteration 2 Extensions)

- **`LLMToolCallContentPart`**: `{ type: 'tool_call', callId: string, toolId: ToolId, arguments: string }`.
- **`LLMToolResultContentPart`**: `{ type: 'tool_result', callId: string, toolId: ToolId, output: string, isError: boolean }`.
- **`LLMContentPart`**: Discriminated union (`LLMTextContentPart | LLMToolCallContentPart | LLMToolResultContentPart`).

### 3. Hierarchical Tool Errors

- **`ToolExecutionError`**: Abstract domain error class extending `AgentRuntimeError` (`toolId: ToolId`, `invocationId: InvocationId`).
- **`ToolTimeoutError`**: Extends `ToolExecutionError` (thrown when tool execution exceeds timeout limit).
- **`ToolValidationError`**: Extends `ToolExecutionError` (thrown when arguments fail schema validation).
- **`ToolPermissionError`**: Extends `ToolExecutionError` (thrown when tenant or user lacks permission to invoke tool).
- **`ToolUnavailableError`**: Extends `ToolExecutionError` (thrown when tool is un-registered or unreachable).

### 4. Primary Application Ports

- **`ToolExecutionPort`**:
  ```typescript
  export interface ToolExecutionPort {
    readonly toolId: ToolId;
    readonly definition: ToolDefinition;
    execute(
      tenantContext: Readonly<TenantContext>,
      invocation: Readonly<ToolInvocation>,
    ): Promise<ToolResult>;
  }
  ```
- **`ToolRegistryPort`**:
  ```typescript
  export interface ToolRegistryPort {
    registerAdapter(toolId: ToolId, adapter: Readonly<ToolExecutionPort>): void;
    resolveAdapter(toolId: ToolId): ToolExecutionPort;
    hasAdapter(toolId: ToolId): boolean;
    getDefinitions(): ReadonlyArray<ToolDefinition>;
  }
  ```
- **`ToolDispatcherPort`**:
  ```typescript
  export interface ToolDispatcherPort {
    dispatch(
      tenantContext: Readonly<TenantContext>,
      invocation: Readonly<ToolInvocation>,
    ): Promise<ToolResult>;
  }
  ```

---

## Consequences

### Positive

- **Strict SRP**: `ToolRegistryPort` handles mutation/lookup; `ToolDispatcherPort` handles execution dispatching.
- **Pure Tool Operations**: `ToolResult` is decoupled from LLM message content parts.
- **Typed Arguments & Schemas**: `ToolArguments` and `ToolSchema` prevent raw `Record<string, unknown>` sprawl.

---

## Compliance & Verification

- **Pure Domain Rules (ADR-010)**: 0 external framework dependencies in domain VOs and errors.
- **Tenant Isolation (ADR-001)**: `dispatch()` accepts `Readonly<TenantContext>` as its first parameter.
- **Contract Tests**: Verified by `tool-execution.contract.test.ts`.

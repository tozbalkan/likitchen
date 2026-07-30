import { AgentRuntimeError } from './agent-runtime-error';
import type { ToolId } from '../vo/tool-definition';
import type { InvocationId } from '../vo/tool-invocation';

export abstract class ToolExecutionError extends AgentRuntimeError {
  protected constructor(
    public readonly toolId: ToolId,
    public readonly invocationId: InvocationId,
    message: string,
  ) {
    super(`[ToolExecutionError:${toolId}] (${invocationId}) ${message}`);
    this.name = this.constructor.name;
  }
}

export class ToolTimeoutError extends ToolExecutionError {
  constructor(
    toolId: ToolId,
    invocationId: InvocationId,
    public readonly timeoutMs: number,
  ) {
    super(toolId, invocationId, `Execution timed out after ${timeoutMs}ms.`);
    this.name = 'ToolTimeoutError';
  }
}

export class ToolValidationError extends ToolExecutionError {
  constructor(
    toolId: ToolId,
    invocationId: InvocationId,
    public readonly validationErrors: ReadonlyArray<string>,
  ) {
    super(
      toolId,
      invocationId,
      `Argument validation failed: ${validationErrors.join('; ')}`,
    );
    this.name = 'ToolValidationError';
  }
}

export class ToolPermissionError extends ToolExecutionError {
  constructor(
    toolId: ToolId,
    invocationId: InvocationId,
    public readonly tenantId: string,
  ) {
    super(
      toolId,
      invocationId,
      `Tenant '${tenantId}' lacks permission to invoke tool '${toolId}'.`,
    );
    this.name = 'ToolPermissionError';
  }
}

export class ToolUnavailableError extends ToolExecutionError {
  constructor(toolId: ToolId, invocationId: InvocationId) {
    super(
      toolId,
      invocationId,
      `Tool '${toolId}' is unregistered or currently unavailable.`,
    );
    this.name = 'ToolUnavailableError';
  }
}

export class DuplicateToolRegistrationError extends ToolExecutionError {
  constructor(toolId: ToolId) {
    super(
      toolId,
      'BOOTSTRAP_REGISTRATION' as InvocationId,
      `Duplicate tool registration detected for toolId '${toolId}'.`,
    );
    this.name = 'DuplicateToolRegistrationError';
  }
}

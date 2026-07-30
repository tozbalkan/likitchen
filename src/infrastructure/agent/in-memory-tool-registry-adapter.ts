import type { ToolRegistryPort } from '../../application/agent/ports/tool-registry-port';
import type { ToolExecutionPort } from '../../application/agent/ports/tool-execution-port';
import type {
  ToolId,
  ToolDefinition,
} from '../../application/agent/vo/tool-definition';
import type { InvocationId } from '../../application/agent/vo/tool-invocation';
import {
  DuplicateToolRegistrationError,
  ToolUnavailableError,
  ToolValidationError,
} from '../../application/agent/errors/tool-execution-error';

export class InMemoryToolRegistryAdapter implements ToolRegistryPort {
  private readonly adapters = new Map<ToolId, ToolExecutionPort>();

  registerAdapter(toolId: ToolId, adapter: Readonly<ToolExecutionPort>): void {
    if (!toolId || toolId.trim() === '') {
      throw new ToolValidationError(
        toolId ?? ('invalid-tool-id' as ToolId),
        'REGISTRATION' as InvocationId,
        ['Invalid or empty toolId provided.'],
      );
    }
    if (!adapter) {
      throw new ToolValidationError(toolId, 'REGISTRATION' as InvocationId, [
        'ToolExecutionPort adapter is required.',
      ]);
    }

    if (this.adapters.has(toolId)) {
      throw new DuplicateToolRegistrationError(toolId);
    }

    this.adapters.set(toolId, adapter);
  }

  resolveAdapter(toolId: ToolId): ToolExecutionPort {
    const adapter = this.adapters.get(toolId);
    if (!adapter) {
      throw new ToolUnavailableError(toolId, 'LOOKUP' as InvocationId);
    }
    return adapter;
  }

  hasAdapter(toolId: ToolId): boolean {
    return this.adapters.has(toolId);
  }

  getDefinitions(): ReadonlyArray<ToolDefinition> {
    return Array.from(this.adapters.values()).map(
      (adapter) => adapter.definition,
    );
  }
}

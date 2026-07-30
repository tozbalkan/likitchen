import type { ToolRegistryPort } from '../../application/agent/ports/tool-registry-port';
import type { ToolExecutionPort } from '../../application/agent/ports/tool-execution-port';
import type {
  ToolId,
  ToolDefinition,
} from '../../application/agent/vo/tool-definition';

export class InMemoryToolRegistryAdapter implements ToolRegistryPort {
  private readonly adapters = new Map<ToolId, ToolExecutionPort>();

  registerAdapter(toolId: ToolId, adapter: Readonly<ToolExecutionPort>): void {
    if (!toolId || toolId.trim() === '') {
      throw new Error('[InMemoryToolRegistryAdapter] Invalid toolId.');
    }
    if (!adapter) {
      throw new Error(
        '[InMemoryToolRegistryAdapter] ToolExecutionPort adapter is required.',
      );
    }

    if (this.adapters.has(toolId)) {
      throw new Error(
        `[InMemoryToolRegistryAdapter] Duplicate tool registration detected for toolId '${toolId}'.`,
      );
    }

    this.adapters.set(toolId, adapter);
  }

  resolveAdapter(toolId: ToolId): ToolExecutionPort {
    const adapter = this.adapters.get(toolId);
    if (!adapter) {
      throw new Error(
        `[InMemoryToolRegistryAdapter] ToolId '${toolId}' is not registered.`,
      );
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

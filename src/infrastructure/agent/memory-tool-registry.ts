import type {
  ToolResolverPort,
  ToolDefinition,
} from '../../application/agent/ports/tool-resolver-port';

export class MemoryToolRegistryAdapter implements ToolResolverPort {
  private readonly tools = new Map<string, ToolDefinition>();

  register(tool: Readonly<ToolDefinition>): void {
    if (this.tools.has(tool.id)) {
      throw new Error(
        `[MemoryToolRegistryAdapter] Tool with id '${tool.id}' already registered.`,
      );
    }
    this.tools.set(tool.id, tool);
  }

  async resolveTool(toolId: string): Promise<ToolDefinition | undefined> {
    return this.tools.get(toolId);
  }

  async resolveTools(
    toolIds: readonly string[],
  ): Promise<readonly ToolDefinition[]> {
    const results: ToolDefinition[] = [];
    for (const id of toolIds) {
      const tool = this.tools.get(id);
      if (tool) {
        results.push(tool);
      }
    }
    return results;
  }
}

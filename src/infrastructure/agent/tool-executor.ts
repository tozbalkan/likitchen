import type {
  ToolExecutorPort,
  ToolExecutionRequest,
} from '../../application/agent/ports/tool-executor-port';
import type { ToolResolverPort } from '../../application/agent/ports/tool-resolver-port';
import type { ToolCallRecord } from '../../application/agent/runtime/execution-result';

export type ToolHandler = (
  args: Readonly<Record<string, unknown>>,
) => Promise<unknown>;

export class ToolExecutorAdapter implements ToolExecutorPort {
  private readonly handlers = new Map<string, ToolHandler>();

  constructor(private readonly resolver: ToolResolverPort) {}

  registerHandler(toolId: string, handler: ToolHandler): void {
    this.handlers.set(toolId, handler);
  }

  async executeTool(
    request: Readonly<ToolExecutionRequest>,
  ): Promise<ToolCallRecord> {
    const startTime = Date.now();
    const toolDef = await this.resolver.resolveTool(request.toolId);

    if (!toolDef) {
      return {
        toolName: request.toolId,
        arguments: request.arguments,
        durationMs: Date.now() - startTime,
        result: { error: `Tool '${request.toolId}' not found in registry.` },
      };
    }

    const handler = this.handlers.get(request.toolId);
    if (!handler) {
      return {
        toolName: toolDef.name,
        arguments: request.arguments,
        durationMs: Date.now() - startTime,
        result: {
          error: `No handler registered for tool '${request.toolId}'.`,
        },
      };
    }

    try {
      const output = await handler(request.arguments);
      return {
        toolName: toolDef.name,
        arguments: request.arguments,
        durationMs: Date.now() - startTime,
        result: output,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        toolName: toolDef.name,
        arguments: request.arguments,
        durationMs: Date.now() - startTime,
        result: { error: message },
      };
    }
  }
}

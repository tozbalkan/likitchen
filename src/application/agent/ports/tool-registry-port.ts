import type { ToolId, ToolDefinition } from '../vo/tool-definition';
import type { ToolExecutionPort } from './tool-execution-port';

export interface ToolRegistryPort {
  registerAdapter(toolId: ToolId, adapter: Readonly<ToolExecutionPort>): void;
  resolveAdapter(toolId: ToolId): ToolExecutionPort;
  hasAdapter(toolId: ToolId): boolean;
  getDefinitions(): ReadonlyArray<ToolDefinition>;
}

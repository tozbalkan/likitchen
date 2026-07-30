import type { Brand } from '../../../shared/types';
import type { ToolSchema } from './tool-schema';

export type ToolId = Brand<string, 'ToolId'>;
export type ToolExecutionMode = 'local' | 'http' | 'mcp' | 'browser' | 'shell';

export interface ToolDefinitionProps {
  readonly toolId: ToolId;
  readonly displayName: string;
  readonly description: string;
  readonly version: string;
  readonly inputSchema: ToolSchema;
  readonly executionMode?: ToolExecutionMode | undefined;
  readonly outputSchema?: ToolSchema | undefined;
}

export class ToolDefinition {
  readonly toolId: ToolId;
  readonly displayName: string;
  readonly description: string;
  readonly version: string;
  readonly inputSchema: ToolSchema;
  readonly executionMode: ToolExecutionMode;
  readonly outputSchema?: ToolSchema | undefined;

  private constructor(props: Readonly<ToolDefinitionProps>) {
    if (!props.toolId || props.toolId.trim() === '') {
      throw new Error('[ToolDefinition] toolId cannot be empty.');
    }
    if (!props.displayName || props.displayName.trim() === '') {
      throw new Error('[ToolDefinition] displayName cannot be empty.');
    }
    if (!props.inputSchema) {
      throw new Error('[ToolDefinition] inputSchema is required.');
    }

    this.toolId = props.toolId;
    this.displayName = props.displayName;
    this.description = props.description ?? '';
    this.version = props.version ?? '1.0.0';
    this.inputSchema = props.inputSchema;
    this.executionMode = props.executionMode ?? 'local';
    if (props.outputSchema !== undefined) {
      this.outputSchema = props.outputSchema;
    }
    Object.freeze(this);
  }

  static create(props: Readonly<ToolDefinitionProps>): ToolDefinition {
    return new ToolDefinition(props);
  }
}

export interface ToolDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly parametersSchema: Readonly<Record<string, unknown>>;
  readonly requiredPermissions?: readonly string[] | undefined;
}

export interface ToolResolverPort {
  resolveTool(toolId: string): Promise<ToolDefinition | undefined>;
  resolveTools(toolIds: readonly string[]): Promise<readonly ToolDefinition[]>;
}

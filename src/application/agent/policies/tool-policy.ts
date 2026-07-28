export class ToolPolicy {
  readonly allowedToolIds: readonly string[];
  readonly autoExecuteTools: boolean;

  constructor(allowedToolIds: readonly string[] = [], autoExecuteTools = true) {
    this.allowedToolIds = Object.freeze([...allowedToolIds]);
    this.autoExecuteTools = autoExecuteTools;
    Object.freeze(this);
  }

  isToolAllowed(toolId: string): boolean {
    if (this.allowedToolIds.length === 0) return true;
    return this.allowedToolIds.includes(toolId);
  }
}

import type { TenantContext } from '../../identity/tenant-context';
import type { ToolId, ToolDefinition } from '../vo/tool-definition';
import type { ToolInvocation } from '../vo/tool-invocation';
import type { ToolResult } from '../vo/tool-result';

export interface ToolExecutionPort {
  readonly toolId: ToolId;
  readonly definition: ToolDefinition;

  execute(
    tenantContext: Readonly<TenantContext>,
    invocation: Readonly<ToolInvocation>,
  ): Promise<ToolResult>;
}

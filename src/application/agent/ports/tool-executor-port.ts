import type { TenantContext } from '../../identity/tenant-context';
import type { ToolCallRecord } from '../runtime/execution-result';

export interface ToolExecutionRequest {
  readonly toolId: string;
  readonly arguments: Readonly<Record<string, unknown>>;
  readonly tenantContext: TenantContext;
}

export interface ToolExecutorPort {
  executeTool(request: Readonly<ToolExecutionRequest>): Promise<ToolCallRecord>;
}

import type { TenantContext } from '../../identity/tenant-context';
import type { ToolInvocation } from '../vo/tool-invocation';
import type { ToolResult } from '../vo/tool-result';

export interface ToolDispatcherPort {
  dispatch(
    tenantContext: Readonly<TenantContext>,
    invocation: Readonly<ToolInvocation>,
  ): Promise<ToolResult>;
}

import type { ToolDispatcherPort } from '../ports/tool-dispatcher-port';
import type { ToolRegistryPort } from '../ports/tool-registry-port';
import type { TenantContext } from '../../identity/tenant-context';
import type { ToolInvocation } from '../vo/tool-invocation';
import type { ToolResult } from '../vo/tool-result';
import { ToolUnavailableError } from '../errors/tool-execution-error';

export class ToolDispatcher implements ToolDispatcherPort {
  constructor(private readonly registry: Readonly<ToolRegistryPort>) {
    if (!registry) {
      throw new Error('[ToolDispatcher] ToolRegistryPort is required.');
    }
  }

  async dispatch(
    tenantContext: Readonly<TenantContext>,
    invocation: Readonly<ToolInvocation>,
  ): Promise<ToolResult> {
    if (!tenantContext || !tenantContext.tenantId) {
      throw new Error('[ToolDispatcher] TenantContext is required.');
    }
    if (!invocation || !invocation.toolId) {
      throw new Error('[ToolDispatcher] ToolInvocation is required.');
    }

    if (!this.registry.hasAdapter(invocation.toolId)) {
      throw new ToolUnavailableError(
        invocation.toolId,
        invocation.invocationId,
      );
    }

    const adapter = this.registry.resolveAdapter(invocation.toolId);
    return await adapter.execute(tenantContext, invocation);
  }
}

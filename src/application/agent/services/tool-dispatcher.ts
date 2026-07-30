import type { ToolDispatcherPort } from '../ports/tool-dispatcher-port';
import type { ToolRegistryPort } from '../ports/tool-registry-port';
import type { TenantContext } from '../../identity/tenant-context';
import type { ToolInvocation } from '../vo/tool-invocation';
import type { ToolResult } from '../vo/tool-result';
import type { ToolId } from '../vo/tool-definition';
import {
  ToolUnavailableError,
  ToolValidationError,
} from '../errors/tool-execution-error';

export class ToolDispatcher implements ToolDispatcherPort {
  constructor(private readonly registry: Readonly<ToolRegistryPort>) {
    if (!registry) {
      throw new ToolValidationError(
        'DISPATCHER' as ToolId,
        'CONSTRUCTOR' as import('../vo/tool-invocation').InvocationId,
        ['ToolRegistryPort is required.'],
      );
    }
  }

  async dispatch(
    tenantContext: Readonly<TenantContext>,
    invocation: Readonly<ToolInvocation>,
  ): Promise<ToolResult> {
    if (!tenantContext || !tenantContext.tenantId) {
      throw new ToolValidationError(
        invocation?.toolId ?? ('UNKNOWN_TOOL' as ToolId),
        invocation?.invocationId ??
          ('UNKNOWN_INVOCATION' as import('../vo/tool-invocation').InvocationId),
        ['TenantContext with valid tenantId is required.'],
      );
    }
    if (!invocation || !invocation.toolId) {
      throw new ToolValidationError(
        'UNKNOWN_TOOL' as ToolId,
        'UNKNOWN_INVOCATION' as import('../vo/tool-invocation').InvocationId,
        ['Valid ToolInvocation is required.'],
      );
    }

    const adapter = this.registry.resolveAdapter(invocation.toolId);
    return await adapter.execute(tenantContext, invocation);
  }
}

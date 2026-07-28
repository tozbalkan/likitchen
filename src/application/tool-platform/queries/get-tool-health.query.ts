import { TenantContext } from '../../identity/tenant-context';
import type { ToolRegistryRepositoryPort } from '../ports/tool-registry-repository-port';
import { ToolHealthStatus } from '../vo/tool-health-status';

export interface GetToolHealthQuery {
  readonly instanceId: string;
  readonly tenantContext: TenantContext;
}

export class GetToolHealthQueryHandler {
  constructor(private readonly repository: ToolRegistryRepositoryPort) {}

  async execute(
    query: GetToolHealthQuery,
  ): Promise<ToolHealthStatus | undefined> {
    const instance = await this.repository.findInstanceById(
      query.tenantContext,
      query.instanceId,
    );
    return instance?.healthStatus;
  }
}

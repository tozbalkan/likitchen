import { TenantContext } from '../../identity/tenant-context';
import { ToolInstanceReadModel } from '../projections/tool-read-model';
import { ToolProjectionBuilder } from '../projections/tool-projection-builder';
import type { ToolRegistryRepositoryPort } from '../ports/tool-registry-repository-port';

export interface SearchToolInstancesQuery {
  readonly enabledOnly?: boolean | undefined;
  readonly tenantContext: TenantContext;
}

export class SearchToolInstancesQueryHandler {
  constructor(private readonly repository: ToolRegistryRepositoryPort) {}

  async execute(
    query: SearchToolInstancesQuery,
  ): Promise<ReadonlyArray<ToolInstanceReadModel>> {
    const instances = await this.repository.listInstances(query.tenantContext);
    const filtered = query.enabledOnly
      ? instances.filter((i) => i.enabled)
      : instances;
    return filtered.map((i) => ToolProjectionBuilder.buildInstanceReadModel(i));
  }
}

import { TenantContext } from '../../identity/tenant-context';
import { ToolReadModel } from '../projections/tool-read-model';
import { ToolProjectionBuilder } from '../projections/tool-projection-builder';
import type { ToolRegistryRepositoryPort } from '../ports/tool-registry-repository-port';

export interface GetToolDefinitionQuery {
  readonly toolId: string;
  readonly tenantContext: TenantContext;
}

export class GetToolDefinitionQueryHandler {
  constructor(private readonly repository: ToolRegistryRepositoryPort) {}

  async execute(
    query: GetToolDefinitionQuery,
  ): Promise<ToolReadModel | undefined> {
    const definition = await this.repository.findDefinitionById(
      query.tenantContext,
      query.toolId,
    );
    if (!definition) return undefined;
    return ToolProjectionBuilder.buildDefinitionReadModel(definition);
  }
}

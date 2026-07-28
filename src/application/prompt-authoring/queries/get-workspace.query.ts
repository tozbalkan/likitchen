import { TenantContext } from '../../identity/tenant-context';
import type { WorkspaceRepositoryPort } from '../ports/workspace-repository-port';
import { WorkspaceProjectionBuilder } from '../projections/workspace-projection-builder';
import { WorkspaceReadModel } from '../projections/workspace-read-model';

export interface GetWorkspaceQuery {
  readonly workspaceId: string;
  readonly tenantContext: TenantContext;
}

export class GetWorkspaceQueryHandler {
  constructor(private readonly repository: WorkspaceRepositoryPort) {}

  async execute(
    query: GetWorkspaceQuery,
  ): Promise<WorkspaceReadModel | undefined> {
    const workspace = await this.repository.findWorkspaceById(
      query.tenantContext,
      query.workspaceId,
    );
    if (!workspace) {
      return undefined;
    }
    return WorkspaceProjectionBuilder.build(workspace);
  }
}

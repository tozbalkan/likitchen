import { TenantContext } from '../../identity/tenant-context';
import type { WorkspaceRepositoryPort } from '../ports/workspace-repository-port';
import { PromptHistoryProjectionBuilder } from '../projections/prompt-history-projection-builder';
import { PromptHistoryReadModel } from '../projections/prompt-history-read-model';

export interface GetWorkspaceHistoryQuery {
  readonly workspaceId: string;
  readonly tenantContext: TenantContext;
}

export class GetWorkspaceHistoryQueryHandler {
  constructor(private readonly repository: WorkspaceRepositoryPort) {}

  async execute(
    query: GetWorkspaceHistoryQuery,
  ): Promise<PromptHistoryReadModel | undefined> {
    const workspace = await this.repository.findWorkspaceById(
      query.tenantContext,
      query.workspaceId,
    );
    if (!workspace) {
      return undefined;
    }
    return PromptHistoryProjectionBuilder.build(workspace);
  }
}

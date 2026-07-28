import { TenantContext } from '../../identity/tenant-context';
import { PromptWorkspace } from '../prompt-workspace';
import type { WorkspaceRepositoryPort } from '../ports/workspace-repository-port';

export interface ReleaseLeaseCommand {
  readonly workspaceId: string;
  readonly tenantContext: TenantContext;
  readonly ownerId: string;
}

export class ReleaseLeaseCommandHandler {
  constructor(private readonly repository: WorkspaceRepositoryPort) {}

  async execute(command: ReleaseLeaseCommand): Promise<PromptWorkspace> {
    const workspace = await this.repository.findWorkspaceById(
      command.tenantContext,
      command.workspaceId,
    );
    if (!workspace) {
      throw new Error(
        `[ReleaseLeaseCommandHandler] Workspace '${command.workspaceId}' not found.`,
      );
    }

    if (
      !workspace.activeLease ||
      workspace.activeLease.ownerId !== command.ownerId
    ) {
      throw new Error(
        `[ReleaseLeaseCommandHandler] Lease not owned by '${command.ownerId}'.`,
      );
    }

    const updated = workspace.releaseLease();
    await this.repository.saveWorkspace(command.tenantContext, updated);
    return updated;
  }
}

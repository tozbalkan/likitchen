import { TenantContext } from '../../identity/tenant-context';
import { PromptWorkspace } from '../prompt-workspace';
import type { WorkspaceRepositoryPort } from '../ports/workspace-repository-port';

export interface HeartbeatLeaseCommand {
  readonly workspaceId: string;
  readonly tenantContext: TenantContext;
  readonly ownerId: string;
  readonly ttlMs?: number;
}

export class HeartbeatLeaseCommandHandler {
  constructor(private readonly repository: WorkspaceRepositoryPort) {}

  async execute(command: HeartbeatLeaseCommand): Promise<PromptWorkspace> {
    const workspace = await this.repository.findWorkspaceById(
      command.tenantContext,
      command.workspaceId,
    );
    if (!workspace) {
      throw new Error(
        `[HeartbeatLeaseCommandHandler] Workspace '${command.workspaceId}' not found.`,
      );
    }

    if (
      !workspace.activeLease ||
      workspace.activeLease.ownerId !== command.ownerId
    ) {
      throw new Error(
        `[HeartbeatLeaseCommandHandler] Lease not owned by '${command.ownerId}'.`,
      );
    }

    const renewedLease = workspace.activeLease.heartbeat(
      command.ttlMs ?? 30000,
    );
    const updated = workspace.acquireLease(renewedLease);
    await this.repository.saveWorkspace(command.tenantContext, updated);
    return updated;
  }
}

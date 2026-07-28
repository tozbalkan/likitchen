import { TenantContext } from '../../identity/tenant-context';
import { PromptWorkspace } from '../prompt-workspace';
import { WorkspaceLease, LeaseTakeoverPolicy } from '../workspace-lease';
import type { WorkspaceRepositoryPort } from '../ports/workspace-repository-port';

export interface AcquireLeaseCommand {
  readonly workspaceId: string;
  readonly tenantContext: TenantContext;
  readonly ownerId: string;
  readonly ttlMs?: number;
  readonly takeoverPolicy?: LeaseTakeoverPolicy;
}

export class AcquireLeaseCommandHandler {
  constructor(private readonly repository: WorkspaceRepositoryPort) {}

  async execute(command: AcquireLeaseCommand): Promise<PromptWorkspace> {
    const workspace = await this.repository.findWorkspaceById(
      command.tenantContext,
      command.workspaceId,
    );
    if (!workspace) {
      throw new Error(
        `[AcquireLeaseCommandHandler] Workspace '${command.workspaceId}' not found.`,
      );
    }

    if (workspace.activeLease && !workspace.activeLease.isExpired()) {
      if (workspace.activeLease.ownerId !== command.ownerId) {
        const policy =
          command.takeoverPolicy ?? workspace.activeLease.takeoverPolicy;
        if (policy === 'DENY') {
          throw new Error(
            `[AcquireLeaseCommandHandler] Lease acquisition denied for '${command.workspaceId}'.`,
          );
        }
      }
    }

    const newLease = WorkspaceLease.create(
      command.workspaceId,
      command.ownerId,
      command.ttlMs ?? 30000,
      command.takeoverPolicy ?? 'ALLOW_ADMIN',
    );

    const updated = workspace.acquireLease(newLease);
    await this.repository.saveWorkspace(command.tenantContext, updated);
    return updated;
  }
}

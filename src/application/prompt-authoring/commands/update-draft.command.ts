import { TenantContext } from '../../identity/tenant-context';
import { PromptDocument } from '../../prompt/prompt-document';
import { PromptVariableDefinition } from '../prompt-variable-definition';
import { PromptWorkspace } from '../prompt-workspace';
import type { WorkspaceRepositoryPort } from '../ports/workspace-repository-port';

export interface UpdateDraftCommand {
  readonly workspaceId: string;
  readonly tenantContext: TenantContext;
  readonly newDocument: PromptDocument;
  readonly newVariables: ReadonlyArray<PromptVariableDefinition>;
  readonly actor: string;
}

export class UpdateDraftCommandHandler {
  constructor(private readonly repository: WorkspaceRepositoryPort) {}

  async execute(command: UpdateDraftCommand): Promise<PromptWorkspace> {
    const workspace = await this.repository.findWorkspaceById(
      command.tenantContext,
      command.workspaceId,
    );
    if (!workspace) {
      throw new Error(
        `[UpdateDraftCommandHandler] Workspace '${command.workspaceId}' not found.`,
      );
    }

    // Check lease if locked
    if (workspace.activeLease && !workspace.activeLease.isExpired()) {
      if (workspace.activeLease.ownerId !== command.actor) {
        throw new Error(
          `[UpdateDraftCommandHandler] Workspace is locked by '${workspace.activeLease.ownerId}'.`,
        );
      }
    }

    const updated = workspace.updateDraft(
      command.newDocument,
      command.newVariables,
      command.actor,
    );

    await this.repository.saveWorkspace(command.tenantContext, updated);
    return updated;
  }
}

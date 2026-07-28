import { TenantContext } from '../../identity/tenant-context';
import { PromptDocument } from '../../prompt/prompt-document';
import { PromptVariableDefinition } from '../prompt-variable-definition';
import { PromptWorkspace } from '../prompt-workspace';
import type { WorkspaceRepositoryPort } from '../ports/workspace-repository-port';

export interface CreateWorkspaceCommand {
  readonly workspaceId: string;
  readonly promptId: string;
  readonly tenantContext: TenantContext;
  readonly baseVersionId: string;
  readonly baseVersionChecksum: string;
  readonly draftDocument: PromptDocument;
  readonly draftVariables: ReadonlyArray<PromptVariableDefinition>;
  readonly actor: string;
}

export class CreateWorkspaceCommandHandler {
  constructor(private readonly repository: WorkspaceRepositoryPort) {}

  async execute(command: CreateWorkspaceCommand): Promise<PromptWorkspace> {
    const existing = await this.repository.findWorkspaceById(
      command.tenantContext,
      command.workspaceId,
    );
    if (existing) {
      throw new Error(
        `[CreateWorkspaceCommandHandler] Workspace '${command.workspaceId}' already exists.`,
      );
    }

    const workspace = PromptWorkspace.create({
      workspaceId: command.workspaceId,
      promptId: command.promptId,
      tenantContext: command.tenantContext,
      baseVersionId: command.baseVersionId,
      baseVersionChecksum: command.baseVersionChecksum,
      draftDocument: command.draftDocument,
      draftVariables: command.draftVariables,
      actor: command.actor,
    });

    await this.repository.saveWorkspace(command.tenantContext, workspace);
    return workspace;
  }
}

import { TenantContext } from '../../identity/tenant-context';
import { PromptWorkspace } from '../prompt-workspace';
import type { WorkspaceRepositoryPort } from '../ports/workspace-repository-port';
import type { OutboxPort } from '../ports/outbox-port';
import { PromptAuthoringEvent } from '../prompt-authoring-events';

export interface RequestReviewCommand {
  readonly workspaceId: string;
  readonly tenantContext: TenantContext;
  readonly actor: string;
}

export class RequestReviewCommandHandler {
  constructor(
    private readonly repository: WorkspaceRepositoryPort,
    private readonly outbox?: OutboxPort,
  ) {}

  async execute(command: RequestReviewCommand): Promise<PromptWorkspace> {
    const workspace = await this.repository.findWorkspaceById(
      command.tenantContext,
      command.workspaceId,
    );
    if (!workspace) {
      throw new Error(
        `[RequestReviewCommandHandler] Workspace '${command.workspaceId}' not found.`,
      );
    }

    const updated = workspace.transitionLifecycle('IN_REVIEW');
    await this.repository.saveWorkspace(command.tenantContext, updated);

    if (this.outbox) {
      await this.outbox.recordEvent(
        PromptAuthoringEvent.create({
          eventType: 'ReviewRequested',
          workspaceId: command.workspaceId,
          tenantId: command.tenantContext.tenantId,
          actor: command.actor,
          payload: { lifecycle: updated.lifecycle },
        }),
      );
    }

    return updated;
  }
}

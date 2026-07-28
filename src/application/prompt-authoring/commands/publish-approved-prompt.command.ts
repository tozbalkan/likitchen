import { TenantContext } from '../../identity/tenant-context';
import type { WorkspaceRepositoryPort } from '../ports/workspace-repository-port';
import type { PromptPublisherPort } from '../../prompt/ports/prompt-publisher-port';
import type { PromptRepositoryPort } from '../../prompt/ports/prompt-repository-port';
import type { OutboxPort } from '../ports/outbox-port';
import { PromptVersion } from '../../prompt/prompt-version';
import { PromptAuthoringEvent } from '../prompt-authoring-events';

export interface PublishApprovedPromptCommand {
  readonly workspaceId: string;
  readonly tenantContext: TenantContext;
  readonly newVersionNumber: string;
  readonly actor: string;
}

export class PublishApprovedPromptCommandHandler {
  constructor(
    private readonly workspaceRepository: WorkspaceRepositoryPort,
    private readonly promptRepository: PromptRepositoryPort,
    private readonly publisher: PromptPublisherPort,
    private readonly outbox?: OutboxPort,
  ) {}

  async execute(command: PublishApprovedPromptCommand): Promise<PromptVersion> {
    const workspace = await this.workspaceRepository.findWorkspaceById(
      command.tenantContext,
      command.workspaceId,
    );
    if (!workspace) {
      throw new Error(
        `[PublishApprovedPromptCommandHandler] Workspace '${command.workspaceId}' not found.`,
      );
    }

    if (workspace.lifecycle !== 'APPROVED') {
      throw new Error(
        `[PublishApprovedPromptCommandHandler] Workspace '${command.workspaceId}' is in '${workspace.lifecycle}' state, must be APPROVED to publish.`,
      );
    }

    const versionId = `v-${command.workspaceId}-${command.newVersionNumber}`;
    const draftVersion = PromptVersion.create({
      id: versionId,
      promptId: workspace.promptId,
      version: command.newVersionNumber,
      document: workspace.draftDocument,
      status: 'DRAFT',
      createdAt: new Date(),
    });

    // Save version in Capability-021 repository
    await this.promptRepository.saveVersion(
      command.tenantContext,
      draftVersion,
      workspace.draftDocument,
    );

    // Invoke Capability-021 PromptPublisherPort state machine to validate and publish
    const publishedVersion = await this.publisher.publish(
      command.tenantContext,
      versionId,
    );

    // Transition workspace to ARCHIVED
    const archivedWorkspace = workspace.transitionLifecycle('ARCHIVED');
    await this.workspaceRepository.saveWorkspace(
      command.tenantContext,
      archivedWorkspace,
    );

    if (this.outbox) {
      await this.outbox.recordEvent(
        PromptAuthoringEvent.create({
          eventType: 'PromptPublished',
          workspaceId: command.workspaceId,
          tenantId: command.tenantContext.tenantId,
          actor: command.actor,
          payload: {
            versionId: publishedVersion.id,
            version: publishedVersion.version,
          },
        }),
      );
    }

    return publishedVersion;
  }
}

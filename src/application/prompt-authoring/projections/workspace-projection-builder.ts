import { PromptWorkspace } from '../prompt-workspace';
import { WorkspaceReadModel } from './workspace-read-model';

/**
 * WorkspaceProjectionBuilder — Strict one-way projection builder
 * PromptWorkspace Aggregate -> WorkspaceProjectionBuilder -> WorkspaceReadModel
 */
export class WorkspaceProjectionBuilder {
  static build(
    workspace: Readonly<PromptWorkspace>,
    now: Date = new Date(),
  ): WorkspaceReadModel {
    const leaseState = workspace.activeLease
      ? workspace.activeLease.getState(now)
      : 'UNLOCKED';

    return new WorkspaceReadModel({
      workspaceId: workspace.workspaceId,
      promptId: workspace.promptId,
      tenantId: workspace.tenantContext.tenantId,
      baseVersionId: workspace.baseVersionId,
      baseVersionChecksum: workspace.baseVersionChecksum,
      lifecycle: workspace.lifecycle,
      leaseState,
      leaseOwnerId: workspace.activeLease?.ownerId,
      revisionCount: workspace.snapshots.length,
      systemTemplateSnippet: workspace.draftDocument.systemTemplate.slice(
        0,
        100,
      ),
      userTemplateSnippet: workspace.draftDocument.userTemplate.slice(0, 100),
      variableNames: workspace.draftVariables.map((v) => v.name),
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    });
  }
}

import { PromptWorkspace } from '../prompt-workspace';
import {
  PromptHistoryReadModel,
  SnapshotHistoryEntry,
} from './prompt-history-read-model';

export class PromptHistoryProjectionBuilder {
  static build(workspace: Readonly<PromptWorkspace>): PromptHistoryReadModel {
    const entries: SnapshotHistoryEntry[] = workspace.snapshots.map((s) => ({
      revision: s.revision,
      createdAt: s.createdAt,
      createdBy: s.createdBy,
      estimatedSizeBytes: s.estimatedSizeBytes(),
    }));

    return new PromptHistoryReadModel({
      workspaceId: workspace.workspaceId,
      promptId: workspace.promptId,
      tenantId: workspace.tenantContext.tenantId,
      totalRevisions: workspace.snapshots.length,
      entries,
    });
  }
}

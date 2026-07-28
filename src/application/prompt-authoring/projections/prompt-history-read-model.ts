export interface SnapshotHistoryEntry {
  readonly revision: number;
  readonly createdAt: Date;
  readonly createdBy: string;
  readonly estimatedSizeBytes: number;
}

export interface PromptHistoryReadModelProps {
  readonly workspaceId: string;
  readonly promptId: string;
  readonly tenantId: string;
  readonly totalRevisions: number;
  readonly entries: ReadonlyArray<SnapshotHistoryEntry>;
}

export class PromptHistoryReadModel {
  readonly workspaceId: string;
  readonly promptId: string;
  readonly tenantId: string;
  readonly totalRevisions: number;
  readonly entries: ReadonlyArray<SnapshotHistoryEntry>;

  constructor(props: PromptHistoryReadModelProps) {
    this.workspaceId = props.workspaceId;
    this.promptId = props.promptId;
    this.tenantId = props.tenantId;
    this.totalRevisions = props.totalRevisions;
    this.entries = Object.freeze([...props.entries]);
    Object.freeze(this);
  }
}

import { PromptDocument } from '../prompt/prompt-document';
import { PromptVariableDefinition } from './prompt-variable-definition';

export interface WorkspaceSnapshotStoragePolicyProps {
  readonly revisionCount: number;
  readonly maxStorageBytes: number;
  readonly maxSnapshotAgeMs: number;
}

export class WorkspaceSnapshotStoragePolicy {
  readonly revisionCount: number;
  readonly maxStorageBytes: number;
  readonly maxSnapshotAgeMs: number;

  constructor(props: WorkspaceSnapshotStoragePolicyProps) {
    this.revisionCount = props.revisionCount;
    this.maxStorageBytes = props.maxStorageBytes;
    this.maxSnapshotAgeMs = props.maxSnapshotAgeMs;
    Object.freeze(this);
  }

  static defaultPolicy(): WorkspaceSnapshotStoragePolicy {
    return new WorkspaceSnapshotStoragePolicy({
      revisionCount: 20,
      maxStorageBytes: 10 * 1024 * 1024, // 10MB limit
      maxSnapshotAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 days limit
    });
  }
}

export interface WorkspaceSnapshotProps {
  readonly revision: number;
  readonly document: PromptDocument;
  readonly variables: ReadonlyArray<PromptVariableDefinition>;
  readonly createdAt: Date;
  readonly createdBy: string;
}

/**
 * WorkspaceSnapshot — Aggregate Child Entity owned by PromptWorkspace
 */
export class WorkspaceSnapshot {
  readonly revision: number;
  readonly document: PromptDocument;
  readonly variables: ReadonlyArray<PromptVariableDefinition>;
  readonly createdAt: Date;
  readonly createdBy: string;

  constructor(props: WorkspaceSnapshotProps) {
    this.revision = props.revision;
    this.document = props.document;
    this.variables = Object.freeze([...props.variables]);
    this.createdAt = new Date(props.createdAt);
    this.createdBy = props.createdBy;
    Object.freeze(this);
  }

  static create(
    revision: number,
    document: PromptDocument,
    variables: ReadonlyArray<PromptVariableDefinition>,
    createdBy: string,
  ): WorkspaceSnapshot {
    return new WorkspaceSnapshot({
      revision,
      document,
      variables,
      createdAt: new Date(),
      createdBy,
    });
  }

  estimatedSizeBytes(): number {
    const docSize =
      (this.document.systemTemplate?.length ?? 0) +
      (this.document.userTemplate?.length ?? 0);
    const varSize = JSON.stringify(this.variables).length;
    return docSize + varSize;
  }
}

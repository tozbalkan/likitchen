import { TenantContext } from '../identity/tenant-context';
import { PromptDocument } from '../prompt/prompt-document';
import {
  WorkspaceSnapshot,
  WorkspaceSnapshotStoragePolicy,
} from './workspace-snapshot';
import { WorkspaceLease } from './workspace-lease';
import { PromptVariableDefinition } from './prompt-variable-definition';

export type WorkspaceLifecycle =
  'ACTIVE' | 'IN_REVIEW' | 'APPROVED' | 'ARCHIVED';

export interface PromptWorkspaceProps {
  readonly workspaceId: string;
  readonly promptId: string;
  readonly tenantContext: TenantContext;
  readonly baseVersionId: string;
  readonly baseVersionChecksum: string;
  readonly draftDocument: PromptDocument;
  readonly draftVariables: ReadonlyArray<PromptVariableDefinition>;
  readonly lifecycle: WorkspaceLifecycle;
  readonly snapshots: ReadonlyArray<WorkspaceSnapshot>;
  readonly activeLease?: WorkspaceLease | undefined;
  readonly storagePolicy: WorkspaceSnapshotStoragePolicy;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * PromptWorkspace — Aggregate Root
 */
export class PromptWorkspace {
  readonly workspaceId: string;
  readonly promptId: string;
  readonly tenantContext: TenantContext;
  readonly baseVersionId: string;
  readonly baseVersionChecksum: string;
  readonly draftDocument: PromptDocument;
  readonly draftVariables: ReadonlyArray<PromptVariableDefinition>;
  readonly lifecycle: WorkspaceLifecycle;
  readonly snapshots: ReadonlyArray<WorkspaceSnapshot>;
  readonly activeLease?: WorkspaceLease | undefined;
  readonly storagePolicy: WorkspaceSnapshotStoragePolicy;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: PromptWorkspaceProps) {
    this.workspaceId = props.workspaceId;
    this.promptId = props.promptId;
    this.tenantContext = props.tenantContext;
    this.baseVersionId = props.baseVersionId;
    this.baseVersionChecksum = props.baseVersionChecksum;
    this.draftDocument = props.draftDocument;
    this.draftVariables = Object.freeze([...props.draftVariables]);
    this.lifecycle = props.lifecycle;
    this.snapshots = Object.freeze([...props.snapshots]);
    this.activeLease = props.activeLease;
    this.storagePolicy = props.storagePolicy;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);

    Object.freeze(this);
  }

  static create(props: {
    workspaceId: string;
    promptId: string;
    tenantContext: TenantContext;
    baseVersionId: string;
    baseVersionChecksum: string;
    draftDocument: PromptDocument;
    draftVariables: ReadonlyArray<PromptVariableDefinition>;
    actor: string;
    storagePolicy?: WorkspaceSnapshotStoragePolicy;
  }): PromptWorkspace {
    const now = new Date();
    const policy =
      props.storagePolicy ?? WorkspaceSnapshotStoragePolicy.defaultPolicy();
    const initialSnapshot = WorkspaceSnapshot.create(
      1,
      props.draftDocument,
      props.draftVariables,
      props.actor,
    );

    return new PromptWorkspace({
      workspaceId: props.workspaceId,
      promptId: props.promptId,
      tenantContext: props.tenantContext,
      baseVersionId: props.baseVersionId,
      baseVersionChecksum: props.baseVersionChecksum,
      draftDocument: props.draftDocument,
      draftVariables: props.draftVariables,
      lifecycle: 'ACTIVE',
      snapshots: [initialSnapshot],
      storagePolicy: policy,
      createdAt: now,
      updatedAt: now,
    });
  }

  updateDraft(
    newDocument: PromptDocument,
    newVariables: ReadonlyArray<PromptVariableDefinition>,
    actor: string,
    now: Date = new Date(),
  ): PromptWorkspace {
    const nextRevision =
      (this.snapshots[this.snapshots.length - 1]?.revision ?? 0) + 1;
    const newSnapshot = WorkspaceSnapshot.create(
      nextRevision,
      newDocument,
      newVariables,
      actor,
    );

    // Prune snapshots according to 3-axis policy
    const prunedSnapshots = this.applyStoragePolicy(
      [...this.snapshots, newSnapshot],
      now,
    );

    return new PromptWorkspace({
      workspaceId: this.workspaceId,
      promptId: this.promptId,
      tenantContext: this.tenantContext,
      baseVersionId: this.baseVersionId,
      baseVersionChecksum: this.baseVersionChecksum,
      draftDocument: newDocument,
      draftVariables: newVariables,
      lifecycle: this.lifecycle,
      snapshots: prunedSnapshots,
      activeLease: this.activeLease,
      storagePolicy: this.storagePolicy,
      createdAt: this.createdAt,
      updatedAt: now,
    });
  }

  acquireLease(lease: WorkspaceLease): PromptWorkspace {
    return new PromptWorkspace({
      workspaceId: this.workspaceId,
      promptId: this.promptId,
      tenantContext: this.tenantContext,
      baseVersionId: this.baseVersionId,
      baseVersionChecksum: this.baseVersionChecksum,
      draftDocument: this.draftDocument,
      draftVariables: this.draftVariables,
      lifecycle: this.lifecycle,
      snapshots: this.snapshots,
      activeLease: lease,
      storagePolicy: this.storagePolicy,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  releaseLease(): PromptWorkspace {
    return new PromptWorkspace({
      workspaceId: this.workspaceId,
      promptId: this.promptId,
      tenantContext: this.tenantContext,
      baseVersionId: this.baseVersionId,
      baseVersionChecksum: this.baseVersionChecksum,
      draftDocument: this.draftDocument,
      draftVariables: this.draftVariables,
      lifecycle: this.lifecycle,
      snapshots: this.snapshots,
      activeLease: undefined,
      storagePolicy: this.storagePolicy,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  transitionLifecycle(newLifecycle: WorkspaceLifecycle): PromptWorkspace {
    return new PromptWorkspace({
      workspaceId: this.workspaceId,
      promptId: this.promptId,
      tenantContext: this.tenantContext,
      baseVersionId: this.baseVersionId,
      baseVersionChecksum: this.baseVersionChecksum,
      draftDocument: this.draftDocument,
      draftVariables: this.draftVariables,
      lifecycle: newLifecycle,
      snapshots: this.snapshots,
      activeLease: this.activeLease,
      storagePolicy: this.storagePolicy,
      createdAt: this.createdAt,
      updatedAt: new Date(),
    });
  }

  restoreSnapshot(revision: number): PromptWorkspace {
    const target = this.snapshots.find((s) => s.revision === revision);
    if (!target) {
      throw new Error(
        `[PromptWorkspace] Snapshot revision ${revision} not found.`,
      );
    }
    return this.updateDraft(
      target.document,
      target.variables,
      'system-restore',
    );
  }

  private applyStoragePolicy(
    snapshots: WorkspaceSnapshot[],
    now: Date,
  ): WorkspaceSnapshot[] {
    let result = [...snapshots];

    // 1. Retention age limit
    result = result.filter(
      (s) =>
        now.getTime() - s.createdAt.getTime() <=
        this.storagePolicy.maxSnapshotAgeMs,
    );

    // 2. Revision count limit
    if (result.length > this.storagePolicy.revisionCount) {
      result = result.slice(result.length - this.storagePolicy.revisionCount);
    }

    // 3. Byte limit
    let totalBytes = result.reduce((sum, s) => sum + s.estimatedSizeBytes(), 0);
    while (
      result.length > 1 &&
      totalBytes > this.storagePolicy.maxStorageBytes
    ) {
      const removed = result.shift();
      if (removed) {
        totalBytes -= removed.estimatedSizeBytes();
      }
    }

    return result;
  }
}

import { createHash } from 'node:crypto';
import type { ContextEntry } from '../vo/context-entry';
import type { ContextConflict } from '../vo/context-conflict';
import type { ContextAssemblyTrace } from '../vo/context-assembly-trace';
import type { ContextAssemblyRequest } from '../vo/context-assembly-request';

export interface ContextSnapshotProps {
  readonly snapshotId: string;
  readonly requestId: string;
  readonly tenantId: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId?: string | undefined;
  readonly planInstanceId: string;
  readonly nodeId: string;
  readonly query: string;
  readonly entries: ReadonlyArray<ContextEntry>;
  readonly conflicts: ReadonlyArray<ContextConflict>;
  readonly assemblyTrace: ContextAssemblyTrace;
  readonly snapshotChecksum: string;
  readonly snapshotVersion: number;
  readonly createdAt: Date;
}

/**
 * Immutable aggregate root representing the complete context assembled
 * for a specific execution/decision point.
 *
 * Once created, a ContextSnapshot is never mutated.
 * New assemblies create new snapshots.
 * Previous snapshots remain readable for audit and reproducibility.
 */
export class ContextSnapshot {
  readonly snapshotId: string;
  readonly requestId: string;
  readonly tenantId: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId?: string | undefined;
  readonly planInstanceId: string;
  readonly nodeId: string;
  readonly query: string;
  readonly entries: ReadonlyArray<ContextEntry>;
  readonly conflicts: ReadonlyArray<ContextConflict>;
  readonly assemblyTrace: ContextAssemblyTrace;
  readonly snapshotChecksum: string;
  readonly snapshotVersion: number;
  readonly createdAt: Date;

  constructor(props: ContextSnapshotProps) {
    if (!props.snapshotId || props.snapshotId.trim() === '') {
      throw new Error('[ContextSnapshot] snapshotId is strictly required.');
    }
    if (!props.requestId || props.requestId.trim() === '') {
      throw new Error('[ContextSnapshot] requestId is strictly required.');
    }
    if (!props.tenantId || props.tenantId.trim() === '') {
      throw new Error('[ContextSnapshot] tenantId is strictly required.');
    }

    this.snapshotId = props.snapshotId;
    this.requestId = props.requestId;
    this.tenantId = props.tenantId;
    this.organizationId = props.organizationId;
    this.workspaceId = props.workspaceId;
    this.userId = props.userId;
    this.planInstanceId = props.planInstanceId;
    this.nodeId = props.nodeId;
    this.query = props.query;
    this.entries = Object.freeze([...props.entries]);
    this.conflicts = Object.freeze([...props.conflicts]);
    this.assemblyTrace = props.assemblyTrace;
    this.snapshotChecksum = props.snapshotChecksum;
    this.snapshotVersion = props.snapshotVersion;
    this.createdAt = new Date(props.createdAt);

    Object.freeze(this);
  }

  /**
   * Computes a deterministic SHA-256 checksum from the canonical representation
   * of the snapshot's content. Same logical inputs produce the same checksum.
   */
  static computeChecksum(
    request: Readonly<ContextAssemblyRequest>,
    entries: ReadonlyArray<ContextEntry>,
    conflicts: ReadonlyArray<ContextConflict>,
  ): string {
    const entryPayload = entries
      .map(
        (e) =>
          `${e.entryId}|${e.sourceType}|${e.sourceId}|${e.scope}|${e.scopeId}|${e.priority}|${e.relevanceScore}|${e.conflictStatus}`,
      )
      .sort()
      .join(';');

    const conflictPayload = conflicts
      .map(
        (c) =>
          `${c.conflictId}|${c.semanticKey}|${c.competingEntryIds.join(',')}|${c.resolutionState}`,
      )
      .sort()
      .join(';');

    const canonical = [
      `REQ:${request.requestId}`,
      `TENANT:${request.tenantId}`,
      `PLAN:${request.planInstanceId}`,
      `NODE:${request.nodeId}`,
      `QUERY:${request.query}`,
      `SCOPES:${[...request.permittedScopes].sort().join(',')}`,
      `ENTRIES:${entryPayload}`,
      `CONFLICTS:${conflictPayload}`,
    ].join('|');

    return `sha256-${createHash('sha256').update(canonical).digest('hex')}`;
  }
}

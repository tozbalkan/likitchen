import type { EvidenceReference } from './evidence-reference';

export type ConflictResolutionState =
  'DEFERRED_TO_AGENT' | 'RESOLVED' | 'NOT_A_CONFLICT';

export interface ContextConflictProps {
  readonly conflictId: string;
  readonly semanticKey: string;
  readonly competingEntryIds: ReadonlyArray<string>;
  readonly conflictType: string;
  readonly priorityMetadata: ReadonlyArray<{
    readonly entryId: string;
    readonly priority: number;
    readonly sourceType: string;
  }>;
  readonly resolutionState: ConflictResolutionState;
  readonly evidence: ReadonlyArray<EvidenceReference>;
}

/**
 * Describes a detected semantic conflict between two or more context entries.
 * Default resolution state is DEFERRED_TO_AGENT — the assembly layer does not
 * silently resolve semantic conflicts.
 */
export class ContextConflict {
  readonly conflictId: string;
  readonly semanticKey: string;
  readonly competingEntryIds: ReadonlyArray<string>;
  readonly conflictType: string;
  readonly priorityMetadata: ReadonlyArray<{
    readonly entryId: string;
    readonly priority: number;
    readonly sourceType: string;
  }>;
  readonly resolutionState: ConflictResolutionState;
  readonly evidence: ReadonlyArray<EvidenceReference>;

  constructor(props: ContextConflictProps) {
    if (!props.conflictId || props.conflictId.trim() === '') {
      throw new Error('[ContextConflict] conflictId is strictly required.');
    }
    if (props.competingEntryIds.length < 2) {
      throw new Error(
        '[ContextConflict] A conflict requires at least two competing entries.',
      );
    }

    this.conflictId = props.conflictId;
    this.semanticKey = props.semanticKey;
    this.competingEntryIds = Object.freeze([...props.competingEntryIds]);
    this.conflictType = props.conflictType;
    this.priorityMetadata = Object.freeze(
      props.priorityMetadata.map((m) => Object.freeze({ ...m })),
    );
    this.resolutionState = props.resolutionState;
    this.evidence = Object.freeze([...props.evidence]);

    Object.freeze(this);
  }
}

import type { ContextSourceType } from './context-source-type';
import type { EvidenceReference } from './evidence-reference';
import type { MemoryScope } from '../../memory-knowledge/vo/memory-scope-context';

export type ConflictStatus = 'NONE' | 'DETECTED' | 'COMPETING';

export interface ContextEntryProps {
  readonly entryId: string;
  readonly sourceType: ContextSourceType;
  readonly sourceId: string;
  readonly scope: MemoryScope;
  readonly scopeId: string;
  readonly priority: number;
  readonly content: string;
  readonly tokenEstimate: number;
  readonly relevanceScore: number;
  readonly evidence: EvidenceReference;
  readonly conflictStatus: ConflictStatus;
  readonly createdAt: Date;
}

/**
 * Normalized representation of a single piece of contextual information.
 * Every entry is traceable back to its source through the EvidenceReference.
 */
export class ContextEntry {
  readonly entryId: string;
  readonly sourceType: ContextSourceType;
  readonly sourceId: string;
  readonly scope: MemoryScope;
  readonly scopeId: string;
  readonly priority: number;
  readonly content: string;
  readonly tokenEstimate: number;
  readonly relevanceScore: number;
  readonly evidence: EvidenceReference;
  readonly conflictStatus: ConflictStatus;
  readonly createdAt: Date;

  constructor(props: ContextEntryProps) {
    if (!props.entryId || props.entryId.trim() === '') {
      throw new Error('[ContextEntry] entryId is strictly required.');
    }
    if (!props.content && props.content !== '') {
      throw new Error('[ContextEntry] content must be defined.');
    }
    if (props.tokenEstimate < 0) {
      throw new Error('[ContextEntry] tokenEstimate cannot be negative.');
    }

    this.entryId = props.entryId;
    this.sourceType = props.sourceType;
    this.sourceId = props.sourceId;
    this.scope = props.scope;
    this.scopeId = props.scopeId;
    this.priority = props.priority;
    this.content = props.content;
    this.tokenEstimate = props.tokenEstimate;
    this.relevanceScore = props.relevanceScore;
    this.evidence = Object.freeze({ ...props.evidence });
    this.conflictStatus = props.conflictStatus;
    this.createdAt = new Date(props.createdAt);

    Object.freeze(this);
  }

  withConflictStatus(status: ConflictStatus): ContextEntry {
    return new ContextEntry({
      ...this,
      conflictStatus: status,
    });
  }
}

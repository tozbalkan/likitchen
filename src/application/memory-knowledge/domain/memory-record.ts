import { MemoryScopeContext } from '../vo/memory-scope-context';

export type MemoryState = 'ACTIVE' | 'SUPERSEDED' | 'ARCHIVED' | 'DELETED';
export type MemoryType =
  'REFLECTION' | 'USER_PREFERENCE' | 'SEMANTIC_FACT' | 'WORKING_CONTEXT';

export interface MemoryRecordProps {
  readonly memoryId: string;
  readonly scopeContext: MemoryScopeContext;
  readonly memoryType: MemoryType;
  readonly key: string;
  readonly content: string;
  readonly confidenceScore: number;
  readonly memoryVersion: number;
  readonly state: MemoryState;
  readonly supersededByMemoryId?: string | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt?: Date | undefined;
}

export class MemoryRecord {
  readonly memoryId: string;
  readonly scopeContext: MemoryScopeContext;
  readonly memoryType: MemoryType;
  readonly key: string;
  readonly content: string;
  readonly confidenceScore: number;
  readonly memoryVersion: number;
  readonly state: MemoryState;
  readonly supersededByMemoryId?: string | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly expiresAt?: Date | undefined;

  constructor(props: MemoryRecordProps) {
    if (!props.memoryId || props.memoryId.trim() === '') {
      throw new Error('[MemoryRecord] memoryId is strictly required.');
    }
    if (!props.key || props.key.trim() === '') {
      throw new Error('[MemoryRecord] key is strictly required.');
    }
    if (props.confidenceScore < 0 || props.confidenceScore > 1) {
      throw new Error(
        '[MemoryRecord] confidenceScore must be between 0.0 and 1.0.',
      );
    }

    this.memoryId = props.memoryId;
    this.scopeContext = props.scopeContext;
    this.memoryType = props.memoryType;
    this.key = props.key;
    this.content = props.content;
    this.confidenceScore = props.confidenceScore;
    this.memoryVersion = props.memoryVersion;
    this.state = props.state;
    this.supersededByMemoryId = props.supersededByMemoryId;
    this.metadata = props.metadata
      ? Object.freeze({ ...props.metadata })
      : undefined;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
    this.expiresAt = props.expiresAt ? new Date(props.expiresAt) : undefined;

    Object.freeze(this);
  }

  static create(
    props: Omit<
      MemoryRecordProps,
      | 'memoryVersion'
      | 'state'
      | 'supersededByMemoryId'
      | 'createdAt'
      | 'updatedAt'
    >,
  ): MemoryRecord {
    const now = new Date();
    return new MemoryRecord({
      ...props,
      memoryVersion: 1,
      state: 'ACTIVE',
      createdAt: now,
      updatedAt: now,
    });
  }

  supersede(newMemoryId: string): MemoryRecord {
    if (this.state !== 'ACTIVE') {
      throw new Error(
        `[MemoryRecord] Cannot supersede memory record in state '${this.state}'. Only ACTIVE records can be superseded.`,
      );
    }
    return new MemoryRecord({
      ...this,
      state: 'SUPERSEDED',
      supersededByMemoryId: newMemoryId,
      memoryVersion: this.memoryVersion + 1,
      updatedAt: new Date(),
    });
  }

  archive(): MemoryRecord {
    if (this.state === 'DELETED') {
      throw new Error(
        '[MemoryRecord] Cannot archive a DELETED memory tombstone.',
      );
    }
    return new MemoryRecord({
      ...this,
      state: 'ARCHIVED',
      memoryVersion: this.memoryVersion + 1,
      updatedAt: new Date(),
    });
  }

  delete(): MemoryRecord {
    // Tombstone transition: preserves lineage & identifier metadata without retrievable content
    return new MemoryRecord({
      ...this,
      content: '', // Redact content on tombstone deletion
      state: 'DELETED',
      memoryVersion: this.memoryVersion + 1,
      updatedAt: new Date(),
    });
  }

  isRetrievable(): boolean {
    return this.state === 'ACTIVE';
  }
}

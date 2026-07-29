import { MemoryScopeContext } from '../vo/memory-scope-context';

export type KnowledgeSourceType =
  'DOCUMENT' | 'URL' | 'STRUCTURED_DATA' | 'EXECUTION_ARTIFACT';

export type KnowledgeRevalidationStatus =
  'VALID' | 'STALE' | 'REVALIDATION_REQUIRED';

export interface KnowledgeProvenanceProps {
  readonly sourceUri: string;
  readonly ingestedAt: Date;
  readonly sourceAuthor?: string | undefined;
  readonly sourceSystem?: string | undefined;
  readonly licensing?: string | undefined;
}

export class KnowledgeProvenance {
  readonly sourceUri: string;
  readonly ingestedAt: Date;
  readonly sourceAuthor?: string | undefined;
  readonly sourceSystem?: string | undefined;
  readonly licensing?: string | undefined;

  constructor(props: KnowledgeProvenanceProps) {
    this.sourceUri = props.sourceUri;
    this.ingestedAt = new Date(props.ingestedAt);
    this.sourceAuthor = props.sourceAuthor;
    this.sourceSystem = props.sourceSystem;
    this.licensing = props.licensing;
    Object.freeze(this);
  }
}

export interface KnowledgeFreshnessPolicyProps {
  readonly ttlMs?: number | undefined;
  readonly lastValidatedAt: Date;
  readonly revalidationStatus: KnowledgeRevalidationStatus;
}

export class KnowledgeFreshnessPolicy {
  readonly ttlMs?: number | undefined;
  readonly lastValidatedAt: Date;
  readonly revalidationStatus: KnowledgeRevalidationStatus;

  constructor(props: KnowledgeFreshnessPolicyProps) {
    this.ttlMs = props.ttlMs;
    this.lastValidatedAt = new Date(props.lastValidatedAt);
    this.revalidationStatus = props.revalidationStatus;
    Object.freeze(this);
  }

  getFreshnessMultiplier(now: Date = new Date()): number {
    if (this.revalidationStatus === 'REVALIDATION_REQUIRED') return 0.0;
    if (this.revalidationStatus === 'STALE') return 0.5;

    if (this.ttlMs !== undefined) {
      const ageMs = now.getTime() - this.lastValidatedAt.getTime();
      if (ageMs > this.ttlMs) return 0.5; // Stale due to TTL expiry
    }

    return 1.0; // Fully valid
  }
}

export interface KnowledgeVersionSnapshotProps {
  readonly versionId: string;
  readonly checksum: string; // SHA-256
  readonly contentHash: string;
  readonly title: string;
  readonly summary?: string | undefined;
  readonly contentChunks: ReadonlyArray<string>;
  readonly createdAt: Date;
}

export class KnowledgeVersionSnapshot {
  readonly versionId: string;
  readonly checksum: string;
  readonly contentHash: string;
  readonly title: string;
  readonly summary?: string | undefined;
  readonly contentChunks: ReadonlyArray<string>;
  readonly createdAt: Date;

  constructor(props: KnowledgeVersionSnapshotProps) {
    this.versionId = props.versionId;
    this.checksum = props.checksum;
    this.contentHash = props.contentHash;
    this.title = props.title;
    this.summary = props.summary;
    this.contentChunks = Object.freeze([...props.contentChunks]);
    this.createdAt = new Date(props.createdAt);
    Object.freeze(this);
  }
}

export interface KnowledgeDocumentProps {
  readonly knowledgeId: string;
  readonly scopeContext: MemoryScopeContext;
  readonly sourceType: KnowledgeSourceType;
  readonly provenance: KnowledgeProvenance;
  readonly freshness: KnowledgeFreshnessPolicy;
  readonly activeVersionId: string;
  readonly versions: ReadonlyArray<KnowledgeVersionSnapshot>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class KnowledgeDocument {
  readonly knowledgeId: string;
  readonly scopeContext: MemoryScopeContext;
  readonly sourceType: KnowledgeSourceType;
  readonly provenance: KnowledgeProvenance;
  readonly freshness: KnowledgeFreshnessPolicy;
  readonly activeVersionId: string;
  readonly versions: ReadonlyArray<KnowledgeVersionSnapshot>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: KnowledgeDocumentProps) {
    if (!props.knowledgeId || props.knowledgeId.trim() === '') {
      throw new Error('[KnowledgeDocument] knowledgeId is strictly required.');
    }
    if (props.versions.length === 0) {
      throw new Error(
        '[KnowledgeDocument] Must contain at least one KnowledgeVersionSnapshot.',
      );
    }

    this.knowledgeId = props.knowledgeId;
    this.scopeContext = props.scopeContext;
    this.sourceType = props.sourceType;
    this.provenance = props.provenance;
    this.freshness = props.freshness;
    this.activeVersionId = props.activeVersionId;
    this.versions = Object.freeze([...props.versions]);
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);

    Object.freeze(this);
  }

  getActiveVersion(): KnowledgeVersionSnapshot {
    const active = this.versions.find(
      (v) => v.versionId === this.activeVersionId,
    );
    if (!active) {
      throw new Error(
        `[KnowledgeDocument] Active version '${this.activeVersionId}' not found in version list.`,
      );
    }
    return active;
  }

  addVersion(snapshot: KnowledgeVersionSnapshot): KnowledgeDocument {
    return new KnowledgeDocument({
      ...this,
      activeVersionId: snapshot.versionId,
      versions: [...this.versions, snapshot],
      updatedAt: new Date(),
    });
  }

  withFreshness(freshness: KnowledgeFreshnessPolicy): KnowledgeDocument {
    return new KnowledgeDocument({
      ...this,
      freshness,
      updatedAt: new Date(),
    });
  }
}

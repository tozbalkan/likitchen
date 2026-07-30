import type { MemoryType } from '../../memory-knowledge/domain/memory-record';
import type {
  KnowledgeSourceType,
  KnowledgeRevalidationStatus,
} from '../../memory-knowledge/domain/knowledge-document';
import type { VariableScope } from '../../planning-orchestration/vo/variable-reference';

/**
 * Discriminated union for provenance tracking.
 * Every ContextEntry must carry exactly one EvidenceReference.
 */
export type EvidenceReference =
  | MemoryEvidence
  | KnowledgeEvidence
  | ArtifactEvidence
  | VariableEvidence
  | ExecutionTraceEvidence
  | SystemContextEvidence;

export interface MemoryEvidence {
  readonly type: 'MEMORY';
  readonly memoryId: string;
  readonly memoryVersion: number;
  readonly memoryType: MemoryType;
  readonly key: string;
  readonly confidenceScore: number;
  readonly retrievalScore: number;
  readonly selectionReason: string;
}

export interface KnowledgeEvidence {
  readonly type: 'KNOWLEDGE';
  readonly knowledgeId: string;
  readonly versionId: string;
  readonly checksum: string;
  readonly sourceUri: string;
  readonly sourceType: KnowledgeSourceType;
  readonly freshnessStatus: KnowledgeRevalidationStatus;
  readonly retrievalScore: number;
  readonly selectionReason: string;
}

export interface ArtifactEvidence {
  readonly type: 'ARTIFACT';
  readonly artifactId: string;
  readonly producerNodeId: string;
  readonly name: string;
  readonly mimeType: string;
  readonly selectionReason: string;
}

export interface VariableEvidence {
  readonly type: 'VARIABLE';
  readonly key: string;
  readonly variableScope: VariableScope;
  readonly producerNodeId?: string | undefined;
  readonly selectionReason: string;
}

export interface ExecutionTraceEvidence {
  readonly type: 'EXECUTION_TRACE';
  readonly spanId: string;
  readonly nodeId: string;
  readonly behaviorType: string;
  readonly status: string;
  readonly selectionReason: string;
}

export interface SystemContextEvidence {
  readonly type: 'SYSTEM_CONTEXT';
  readonly contextKey: string;
  readonly selectionReason: string;
}

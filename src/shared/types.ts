/**
 * Generic Nominal Branded Type helper.
 * Prevents accidental ID swapping (e.g. passing a WorkspaceId where a TenantId is expected).
 */
export type Brand<T, Tag extends string> = T & { readonly __brand: Tag };

export type Uuid = Brand<string, 'Uuid'>;

/**
 * Instant is an abstraction. Its current implementation is Readonly<Date>
 * but may migrate to Temporal.Instant in the future without changing public APIs.
 */
export type Instant = Readonly<Date>;

export type CorrelationId = Brand<string, 'CorrelationId'>;
export type TraceId = Brand<string, 'TraceId'>;
export type RequestId = Brand<string, 'RequestId'>;
export type IdempotencyKey = Brand<string, 'IdempotencyKey'>;

// ── Nominal Platform Identifiers ──
export type TenantId = Brand<string, 'TenantId'>;
export type OrganizationId = Brand<string, 'OrganizationId'>;
export type WorkspaceId = Brand<string, 'WorkspaceId'>;
export type UserId = Brand<string, 'UserId'>;

export type MemoryId = Brand<string, 'MemoryId'>;
export type KnowledgeId = Brand<string, 'KnowledgeId'>;
export type PlanInstanceId = Brand<string, 'PlanInstanceId'>;
export type NodeId = Brand<string, 'NodeId'>;
export type SnapshotId = Brand<string, 'SnapshotId'>;

export type ProcessContext = Readonly<{
  correlationId: CorrelationId;
  traceId: TraceId;
  requestId?: RequestId;
  idempotencyKey?: IdempotencyKey;
}>;

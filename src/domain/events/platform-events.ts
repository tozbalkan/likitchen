import type { DomainEvent } from './domain-event';

export const PlatformDomainEventTypes = {
  // Capability-024 Workflow Execution Events
  ExecutionInstanceCreated: 'execution.instance_created',
  ExecutionNodesClaimed: 'execution.nodes_claimed',
  ExecutionInstanceCompleted: 'execution.instance_completed',
  ExecutionInstanceFailed: 'execution.instance_failed',

  // Capability-025 Memory & Knowledge Events
  MemoryCreated: 'memory.created',
  MemorySuperseded: 'memory.superseded',
  MemoryArchived: 'memory.archived',
  MemoryDeleted: 'memory.deleted',
  KnowledgeIngested: 'knowledge.ingested',
  KnowledgeVersionAdded: 'knowledge.version_added',

  // Capability-026 Context Intelligence Events
  ContextSnapshotAssembled: 'context.snapshot_assembled',
  ContextConflictDetected: 'context.conflict_detected',
} as const;

export type PlatformDomainEventType =
  (typeof PlatformDomainEventTypes)[keyof typeof PlatformDomainEventTypes];

// ── 024 Events ──

export type ExecutionInstanceCreatedEvent = DomainEvent<
  typeof PlatformDomainEventTypes.ExecutionInstanceCreated,
  {
    readonly instanceId: string;
    readonly tenantId: string;
    readonly planId: string;
    readonly graphId: string;
  }
>;

export type ExecutionPlanCompletedEvent = DomainEvent<
  typeof PlatformDomainEventTypes.ExecutionInstanceCompleted,
  {
    readonly instanceId: string;
    readonly tenantId: string;
    readonly consumedCostUSD: number;
  }
>;

// ── 025 Events ──

export type MemoryCreatedEvent = DomainEvent<
  typeof PlatformDomainEventTypes.MemoryCreated,
  {
    readonly memoryId: string;
    readonly tenantId: string;
    readonly scope: string;
    readonly scopeId: string;
    readonly memoryType: string;
    readonly key: string;
  }
>;

export type MemorySupersededEvent = DomainEvent<
  typeof PlatformDomainEventTypes.MemorySuperseded,
  {
    readonly memoryId: string;
    readonly supersededByMemoryId: string;
    readonly tenantId: string;
    readonly key: string;
  }
>;

export type KnowledgeIngestedEvent = DomainEvent<
  typeof PlatformDomainEventTypes.KnowledgeIngested,
  {
    readonly knowledgeId: string;
    readonly versionId: string;
    readonly tenantId: string;
    readonly sourceType: string;
    readonly sourceUri: string;
  }
>;

// ── 026 Events ──

export type ContextSnapshotAssembledEvent = DomainEvent<
  typeof PlatformDomainEventTypes.ContextSnapshotAssembled,
  {
    readonly snapshotId: string;
    readonly requestId: string;
    readonly tenantId: string;
    readonly planInstanceId: string;
    readonly nodeId: string;
    readonly snapshotChecksum: string;
    readonly entryCount: number;
    readonly conflictCount: number;
  }
>;

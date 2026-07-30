import type { MemoryScope } from '../../memory-knowledge/vo/memory-scope-context';

export interface ContextAssemblyRequestProps {
  readonly requestId: string;
  readonly tenantId: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId?: string | undefined;
  readonly planInstanceId: string;
  readonly nodeId: string;
  readonly query: string;
  readonly permittedScopes: ReadonlyArray<MemoryScope>;
  readonly tokenBudget?: number | undefined;
  readonly maxItems?: number | undefined;
  readonly createdAt: Date;
}

/**
 * Represents a request to assemble context for a specific execution/decision point.
 * The requestId serves as the idempotency key.
 */
export class ContextAssemblyRequest {
  readonly requestId: string;
  readonly tenantId: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly userId?: string | undefined;
  readonly planInstanceId: string;
  readonly nodeId: string;
  readonly query: string;
  readonly permittedScopes: ReadonlyArray<MemoryScope>;
  readonly tokenBudget: number;
  readonly maxItems: number;
  readonly createdAt: Date;

  constructor(props: ContextAssemblyRequestProps) {
    if (!props.requestId || props.requestId.trim() === '') {
      throw new Error(
        '[ContextAssemblyRequest] requestId is strictly required.',
      );
    }
    if (!props.tenantId || props.tenantId.trim() === '') {
      throw new Error(
        '[ContextAssemblyRequest] tenantId is strictly required.',
      );
    }
    if (!props.planInstanceId || props.planInstanceId.trim() === '') {
      throw new Error(
        '[ContextAssemblyRequest] planInstanceId is strictly required.',
      );
    }
    if (!props.nodeId || props.nodeId.trim() === '') {
      throw new Error('[ContextAssemblyRequest] nodeId is strictly required.');
    }
    if (props.permittedScopes.length === 0) {
      throw new Error(
        '[ContextAssemblyRequest] At least one permitted scope is required.',
      );
    }

    this.requestId = props.requestId;
    this.tenantId = props.tenantId;
    this.organizationId = props.organizationId;
    this.workspaceId = props.workspaceId;
    this.userId = props.userId;
    this.planInstanceId = props.planInstanceId;
    this.nodeId = props.nodeId;
    this.query = props.query;
    this.permittedScopes = Object.freeze([...props.permittedScopes]);
    this.tokenBudget = props.tokenBudget ?? 100000;
    this.maxItems = props.maxItems ?? 50;
    this.createdAt = new Date(props.createdAt);

    Object.freeze(this);
  }
}

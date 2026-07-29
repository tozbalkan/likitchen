import { TenantContext } from '../../identity/tenant-context';

export type MemoryScope =
  'TENANT' | 'ORGANIZATION' | 'WORKSPACE' | 'USER' | 'PLAN_INSTANCE';

export interface MemoryScopeContextProps {
  readonly scope: MemoryScope;
  readonly tenantId: string;
  readonly organizationId?: string | undefined;
  readonly workspaceId?: string | undefined;
  readonly userId?: string | undefined;
  readonly planInstanceId?: string | undefined;
}

export class MemoryScopeContext {
  readonly scope: MemoryScope;
  readonly tenantId: string;
  readonly organizationId?: string | undefined;
  readonly workspaceId?: string | undefined;
  readonly userId?: string | undefined;
  readonly planInstanceId?: string | undefined;
  readonly scopeId: string;

  constructor(props: MemoryScopeContextProps) {
    if (!props.tenantId || props.tenantId.trim() === '') {
      throw new Error('[MemoryScopeContext] tenantId is strictly required.');
    }

    this.scope = props.scope;
    this.tenantId = props.tenantId;

    switch (props.scope) {
      case 'TENANT':
        this.scopeId = props.tenantId;
        break;
      case 'ORGANIZATION':
        if (!props.organizationId || props.organizationId.trim() === '') {
          throw new Error(
            '[MemoryScopeContext] ORGANIZATION scope requires organizationId.',
          );
        }
        this.organizationId = props.organizationId;
        this.scopeId = props.organizationId;
        break;
      case 'WORKSPACE':
        if (!props.organizationId || props.organizationId.trim() === '') {
          throw new Error(
            '[MemoryScopeContext] WORKSPACE scope requires organizationId.',
          );
        }
        if (!props.workspaceId || props.workspaceId.trim() === '') {
          throw new Error(
            '[MemoryScopeContext] WORKSPACE scope requires workspaceId.',
          );
        }
        this.organizationId = props.organizationId;
        this.workspaceId = props.workspaceId;
        this.scopeId = props.workspaceId;
        break;
      case 'USER':
        if (!props.organizationId || props.organizationId.trim() === '') {
          throw new Error(
            '[MemoryScopeContext] USER scope requires organizationId.',
          );
        }
        if (!props.workspaceId || props.workspaceId.trim() === '') {
          throw new Error(
            '[MemoryScopeContext] USER scope requires workspaceId.',
          );
        }
        if (!props.userId || props.userId.trim() === '') {
          throw new Error('[MemoryScopeContext] USER scope requires userId.');
        }
        this.organizationId = props.organizationId;
        this.workspaceId = props.workspaceId;
        this.userId = props.userId;
        this.scopeId = props.userId;
        break;
      case 'PLAN_INSTANCE':
        if (!props.organizationId || props.organizationId.trim() === '') {
          throw new Error(
            '[MemoryScopeContext] PLAN_INSTANCE scope requires organizationId.',
          );
        }
        if (!props.workspaceId || props.workspaceId.trim() === '') {
          throw new Error(
            '[MemoryScopeContext] PLAN_INSTANCE scope requires workspaceId.',
          );
        }
        if (!props.planInstanceId || props.planInstanceId.trim() === '') {
          throw new Error(
            '[MemoryScopeContext] PLAN_INSTANCE scope requires planInstanceId.',
          );
        }
        this.organizationId = props.organizationId;
        this.workspaceId = props.workspaceId;
        this.planInstanceId = props.planInstanceId;
        this.scopeId = props.planInstanceId;
        break;
      default:
        throw new Error(`[MemoryScopeContext] Unknown scope '${props.scope}'.`);
    }

    Object.freeze(this);
  }

  static fromTenant(
    tenantContext: Readonly<TenantContext>,
  ): MemoryScopeContext {
    return new MemoryScopeContext({
      scope: 'TENANT',
      tenantId: tenantContext.tenantId,
      organizationId: tenantContext.organizationId,
      workspaceId: tenantContext.workspaceId,
    });
  }

  static fromWorkspace(
    tenantContext: Readonly<TenantContext>,
  ): MemoryScopeContext {
    return new MemoryScopeContext({
      scope: 'WORKSPACE',
      tenantId: tenantContext.tenantId,
      organizationId: tenantContext.organizationId,
      workspaceId: tenantContext.workspaceId,
    });
  }

  static fromUser(
    tenantContext: Readonly<TenantContext>,
    userId: string,
  ): MemoryScopeContext {
    return new MemoryScopeContext({
      scope: 'USER',
      tenantId: tenantContext.tenantId,
      organizationId: tenantContext.organizationId,
      workspaceId: tenantContext.workspaceId,
      userId,
    });
  }

  static fromPlanInstance(
    tenantContext: Readonly<TenantContext>,
    planInstanceId: string,
  ): MemoryScopeContext {
    return new MemoryScopeContext({
      scope: 'PLAN_INSTANCE',
      tenantId: tenantContext.tenantId,
      organizationId: tenantContext.organizationId,
      workspaceId: tenantContext.workspaceId,
      planInstanceId,
    });
  }
}

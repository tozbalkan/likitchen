export interface TenantContextProps {
  readonly tenantId: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly environment: string;
  readonly region: string;
}

export class TenantContext {
  readonly tenantId: string;
  readonly organizationId: string;
  readonly workspaceId: string;
  readonly environment: string;
  readonly region: string;

  private constructor(props: Readonly<TenantContextProps>) {
    if (!props.tenantId || props.tenantId.trim() === '') {
      throw new Error('[TenantContext] tenantId cannot be empty.');
    }
    this.tenantId = props.tenantId;
    this.organizationId = props.organizationId;
    this.workspaceId = props.workspaceId;
    this.environment = props.environment;
    this.region = props.region;
  }

  static create(props: Readonly<TenantContextProps>): TenantContext {
    return new TenantContext(props);
  }

  equals(other: TenantContext | null | undefined): boolean {
    if (!other) return false;
    return (
      this.tenantId === other.tenantId &&
      this.organizationId === other.organizationId &&
      this.workspaceId === other.workspaceId &&
      this.environment === other.environment &&
      this.region === other.region
    );
  }
}

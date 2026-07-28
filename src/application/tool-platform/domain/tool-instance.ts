import { ToolHealthStatus } from '../vo/tool-health-status';
import { ToolExecutionPolicy } from '../vo/tool-execution-policy';

export interface ToolInstanceProps {
  readonly instanceId: string;
  readonly toolId: string;
  readonly tenantId: string;
  readonly version: string;
  readonly credentials?: Readonly<Record<string, string>> | undefined;
  readonly endpointUrl?: string | undefined;
  readonly enabled: boolean;
  readonly customPolicy?: ToolExecutionPolicy | undefined;
  readonly healthStatus: ToolHealthStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class ToolInstance {
  readonly instanceId: string;
  readonly toolId: string;
  readonly tenantId: string;
  readonly version: string;
  readonly credentials?: Readonly<Record<string, string>> | undefined;
  readonly endpointUrl?: string | undefined;
  readonly enabled: boolean;
  readonly customPolicy?: ToolExecutionPolicy | undefined;
  readonly healthStatus: ToolHealthStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ToolInstanceProps) {
    this.instanceId = props.instanceId;
    this.toolId = props.toolId;
    this.tenantId = props.tenantId;
    this.version = props.version;
    this.credentials = props.credentials
      ? Object.freeze({ ...props.credentials })
      : undefined;
    this.endpointUrl = props.endpointUrl;
    this.enabled = props.enabled;
    this.customPolicy = props.customPolicy;
    this.healthStatus = props.healthStatus;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
    Object.freeze(this);
  }

  static create(
    props: Omit<ToolInstanceProps, 'healthStatus' | 'createdAt' | 'updatedAt'>,
  ): ToolInstance {
    const now = new Date();
    return new ToolInstance({
      ...props,
      healthStatus: ToolHealthStatus.createUnknown(),
      createdAt: now,
      updatedAt: now,
    });
  }

  enable(): ToolInstance {
    return new ToolInstance({
      ...this,
      enabled: true,
      updatedAt: new Date(),
    });
  }

  disable(): ToolInstance {
    return new ToolInstance({
      ...this,
      enabled: false,
      updatedAt: new Date(),
    });
  }

  updateHealth(status: ToolHealthStatus): ToolInstance {
    return new ToolInstance({
      ...this,
      healthStatus: status,
      updatedAt: new Date(),
    });
  }
}

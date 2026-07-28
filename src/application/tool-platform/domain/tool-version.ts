import { ToolExecutionPolicy } from '../vo/tool-execution-policy';

export interface ToolVersionProps {
  readonly version: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly defaultPolicy: ToolExecutionPolicy;
  readonly minimumRuntimeVersion?: string | undefined;
  readonly maximumRuntimeVersion?: string | undefined;
  readonly minimumProtocolVersion?: number | undefined;
}

export class ToolVersion {
  readonly version: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly defaultPolicy: ToolExecutionPolicy;
  readonly minimumRuntimeVersion?: string | undefined;
  readonly maximumRuntimeVersion?: string | undefined;
  readonly minimumProtocolVersion?: number | undefined;

  constructor(props: ToolVersionProps) {
    this.version = props.version;
    this.inputSchema = Object.freeze({ ...props.inputSchema });
    this.outputSchema = Object.freeze({ ...props.outputSchema });
    this.defaultPolicy = props.defaultPolicy;
    this.minimumRuntimeVersion = props.minimumRuntimeVersion;
    this.maximumRuntimeVersion = props.maximumRuntimeVersion;
    this.minimumProtocolVersion = props.minimumProtocolVersion;
    Object.freeze(this);
  }

  isCompatibleWith(runtimeVersion: string, protocolVersion?: number): boolean {
    if (
      this.minimumProtocolVersion !== undefined &&
      protocolVersion !== undefined
    ) {
      if (protocolVersion < this.minimumProtocolVersion) return false;
    }
    // Simplistic semver check for minimal compatibility
    if (
      this.minimumRuntimeVersion &&
      runtimeVersion < this.minimumRuntimeVersion
    ) {
      return false;
    }
    return true;
  }
}

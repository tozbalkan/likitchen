import { ToolCategory } from '../vo/tool-category';
import { ToolVersion } from './tool-version';

export interface ToolDefinitionProps {
  readonly toolId: string;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly provider: string;
  readonly versions: ReadonlyArray<ToolVersion>;
  readonly defaultVersion: string;
  readonly requiredPermissions: ReadonlyArray<string>;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class ToolDefinition {
  readonly toolId: string;
  readonly name: string;
  readonly description: string;
  readonly category: ToolCategory;
  readonly provider: string;
  readonly versions: ReadonlyArray<ToolVersion>;
  readonly defaultVersion: string;
  readonly requiredPermissions: ReadonlyArray<string>;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: ToolDefinitionProps) {
    this.toolId = props.toolId;
    this.name = props.name;
    this.description = props.description;
    this.category = props.category;
    this.provider = props.provider;
    this.versions = Object.freeze([...props.versions]);
    this.defaultVersion = props.defaultVersion;
    this.requiredPermissions = Object.freeze([...props.requiredPermissions]);
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
    Object.freeze(this);
  }

  static create(
    props: Omit<ToolDefinitionProps, 'createdAt' | 'updatedAt'>,
  ): ToolDefinition {
    const now = new Date();
    return new ToolDefinition({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  getVersion(versionNumber?: string): ToolVersion | undefined {
    const target = versionNumber ?? this.defaultVersion;
    return this.versions.find((v) => v.version === target);
  }

  addVersion(version: ToolVersion): ToolDefinition {
    const existing = this.versions.filter((v) => v.version !== version.version);
    return new ToolDefinition({
      ...this,
      versions: [...existing, version],
      updatedAt: new Date(),
    });
  }
}

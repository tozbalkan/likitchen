import { PlanVersion } from './plan-version';

export interface PlanDefinitionProps {
  readonly planId: string;
  readonly name: string;
  readonly description: string;
  readonly owner: string;
  readonly versions: ReadonlyArray<PlanVersion>;
  readonly defaultVersion: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class PlanDefinition {
  readonly planId: string;
  readonly name: string;
  readonly description: string;
  readonly owner: string;
  readonly versions: ReadonlyArray<PlanVersion>;
  readonly defaultVersion: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: PlanDefinitionProps) {
    this.planId = props.planId;
    this.name = props.name;
    this.description = props.description;
    this.owner = props.owner;
    this.versions = Object.freeze([...props.versions]);
    this.defaultVersion = props.defaultVersion;
    this.createdAt = new Date(props.createdAt);
    this.updatedAt = new Date(props.updatedAt);
    Object.freeze(this);
  }

  static create(
    props: Omit<PlanDefinitionProps, 'createdAt' | 'updatedAt'>,
  ): PlanDefinition {
    const now = new Date();
    return new PlanDefinition({
      ...props,
      createdAt: now,
      updatedAt: now,
    });
  }

  getVersion(versionNumber?: string): PlanVersion | undefined {
    const target = versionNumber ?? this.defaultVersion;
    return this.versions.find((v) => v.version === target);
  }

  addVersion(version: PlanVersion): PlanDefinition {
    const filtered = this.versions.filter((v) => v.version !== version.version);
    return new PlanDefinition({
      ...this,
      versions: [...filtered, version],
      updatedAt: new Date(),
    });
  }
}

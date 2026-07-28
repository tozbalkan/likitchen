export interface ToolReadModel {
  readonly toolId: string;
  readonly name: string;
  readonly description: string;
  readonly category: string;
  readonly provider: string;
  readonly defaultVersion: string;
  readonly versionsCount: number;
  readonly requiredPermissions: ReadonlyArray<string>;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface ToolInstanceReadModel {
  readonly instanceId: string;
  readonly toolId: string;
  readonly tenantId: string;
  readonly version: string;
  readonly endpointUrl?: string | undefined;
  readonly enabled: boolean;
  readonly healthStatus: string;
  readonly lastCheckedAtIso: string;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

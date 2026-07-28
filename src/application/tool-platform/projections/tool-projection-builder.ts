import { ToolDefinition } from '../domain/tool-definition';
import { ToolInstance } from '../domain/tool-instance';
import { ToolReadModel, ToolInstanceReadModel } from './tool-read-model';

export class ToolProjectionBuilder {
  static buildDefinitionReadModel(
    definition: Readonly<ToolDefinition>,
  ): ToolReadModel {
    return Object.freeze({
      toolId: definition.toolId,
      name: definition.name,
      description: definition.description,
      category: definition.category,
      provider: definition.provider,
      defaultVersion: definition.defaultVersion,
      versionsCount: definition.versions.length,
      requiredPermissions: [...definition.requiredPermissions],
      createdAtIso: definition.createdAt.toISOString(),
      updatedAtIso: definition.updatedAt.toISOString(),
    });
  }

  static buildInstanceReadModel(
    instance: Readonly<ToolInstance>,
  ): ToolInstanceReadModel {
    return Object.freeze({
      instanceId: instance.instanceId,
      toolId: instance.toolId,
      tenantId: instance.tenantId,
      version: instance.version,
      endpointUrl: instance.endpointUrl,
      enabled: instance.enabled,
      healthStatus: instance.healthStatus.status,
      lastCheckedAtIso: instance.healthStatus.lastCheckedAt.toISOString(),
      createdAtIso: instance.createdAt.toISOString(),
      updatedAtIso: instance.updatedAt.toISOString(),
    });
  }
}

import { TenantContext } from '../../identity/tenant-context';
import { ToolDefinition } from '../domain/tool-definition';
import { ToolVersion } from '../domain/tool-version';
import { ToolInstance } from '../domain/tool-instance';
import type { ToolRegistryRepositoryPort } from '../ports/tool-registry-repository-port';

export interface ResolvedTool {
  readonly definition: ToolDefinition;
  readonly version: ToolVersion;
  readonly instance: ToolInstance;
}

export class ToolResolver {
  constructor(private readonly repository: ToolRegistryRepositoryPort) {}

  async resolveTool(
    tenant: Readonly<TenantContext>,
    toolId: string,
    requestedVersion?: string,
    runtimeVersion: string = '1.0.0',
    protocolVersion?: number,
  ): Promise<ResolvedTool> {
    const definition = await this.repository.findDefinitionById(tenant, toolId);
    if (!definition) {
      throw new Error(`[ToolResolver] ToolDefinition '${toolId}' not found.`);
    }

    const version = definition.getVersion(requestedVersion);
    if (!version) {
      throw new Error(
        `[ToolResolver] ToolVersion '${requestedVersion ?? definition.defaultVersion}' not found for tool '${toolId}'.`,
      );
    }

    if (!version.isCompatibleWith(runtimeVersion, protocolVersion)) {
      throw new Error(
        `[ToolResolver] ToolVersion '${version.version}' is incompatible with runtime version '${runtimeVersion}'.`,
      );
    }

    let instance = await this.repository.findInstanceByToolId(tenant, toolId);
    if (!instance) {
      // Auto-provision a default instance for the tenant if none exists
      instance = ToolInstance.create({
        instanceId: `inst-${toolId}-${tenant.tenantId}`,
        toolId,
        tenantId: tenant.tenantId,
        version: version.version,
        enabled: true,
      });
      await this.repository.saveInstance(tenant, instance);
    }

    if (!instance.enabled) {
      throw new Error(
        `[ToolResolver] ToolInstance '${instance.instanceId}' is disabled.`,
      );
    }

    return { definition, version, instance };
  }
}

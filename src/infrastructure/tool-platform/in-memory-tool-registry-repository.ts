import type { ToolRegistryRepositoryPort } from '../../application/tool-platform/ports/tool-registry-repository-port';
import { ToolDefinition } from '../../application/tool-platform/domain/tool-definition';
import { ToolInstance } from '../../application/tool-platform/domain/tool-instance';
import { TenantContext } from '../../application/identity/tenant-context';

export class InMemoryToolRegistryRepositoryAdapter implements ToolRegistryRepositoryPort {
  private readonly definitions = new Map<string, Map<string, ToolDefinition>>();
  private readonly instances = new Map<string, Map<string, ToolInstance>>();

  private getTenantDefMap(tenantId: string): Map<string, ToolDefinition> {
    let map = this.definitions.get(tenantId);
    if (!map) {
      map = new Map<string, ToolDefinition>();
      this.definitions.set(tenantId, map);
    }
    return map;
  }

  private getTenantInstMap(tenantId: string): Map<string, ToolInstance> {
    let map = this.instances.get(tenantId);
    if (!map) {
      map = new Map<string, ToolInstance>();
      this.instances.set(tenantId, map);
    }
    return map;
  }

  async saveDefinition(
    tenant: Readonly<TenantContext>,
    definition: Readonly<ToolDefinition>,
  ): Promise<void> {
    this.getTenantDefMap(tenant.tenantId).set(
      definition.toolId,
      definition as ToolDefinition,
    );
  }

  async findDefinitionById(
    tenant: Readonly<TenantContext>,
    toolId: string,
  ): Promise<ToolDefinition | undefined> {
    return this.getTenantDefMap(tenant.tenantId).get(toolId);
  }

  async listDefinitions(
    tenant: Readonly<TenantContext>,
  ): Promise<ReadonlyArray<ToolDefinition>> {
    return Object.freeze(
      Array.from(this.getTenantDefMap(tenant.tenantId).values()),
    );
  }

  async saveInstance(
    tenant: Readonly<TenantContext>,
    instance: Readonly<ToolInstance>,
  ): Promise<void> {
    this.getTenantInstMap(tenant.tenantId).set(
      instance.instanceId,
      instance as ToolInstance,
    );
  }

  async findInstanceById(
    tenant: Readonly<TenantContext>,
    instanceId: string,
  ): Promise<ToolInstance | undefined> {
    return this.getTenantInstMap(tenant.tenantId).get(instanceId);
  }

  async findInstanceByToolId(
    tenant: Readonly<TenantContext>,
    toolId: string,
  ): Promise<ToolInstance | undefined> {
    const all = Array.from(this.getTenantInstMap(tenant.tenantId).values());
    return all.find((i) => i.toolId === toolId);
  }

  async listInstances(
    tenant: Readonly<TenantContext>,
  ): Promise<ReadonlyArray<ToolInstance>> {
    return Object.freeze(
      Array.from(this.getTenantInstMap(tenant.tenantId).values()),
    );
  }
}

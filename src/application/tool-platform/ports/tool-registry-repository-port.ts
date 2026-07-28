import { TenantContext } from '../../identity/tenant-context';
import { ToolDefinition } from '../domain/tool-definition';
import { ToolInstance } from '../domain/tool-instance';

export interface ToolRegistryRepositoryPort {
  saveDefinition(
    tenant: Readonly<TenantContext>,
    definition: Readonly<ToolDefinition>,
  ): Promise<void>;
  findDefinitionById(
    tenant: Readonly<TenantContext>,
    toolId: string,
  ): Promise<ToolDefinition | undefined>;
  listDefinitions(
    tenant: Readonly<TenantContext>,
  ): Promise<ReadonlyArray<ToolDefinition>>;

  saveInstance(
    tenant: Readonly<TenantContext>,
    instance: Readonly<ToolInstance>,
  ): Promise<void>;
  findInstanceById(
    tenant: Readonly<TenantContext>,
    instanceId: string,
  ): Promise<ToolInstance | undefined>;
  findInstanceByToolId(
    tenant: Readonly<TenantContext>,
    toolId: string,
  ): Promise<ToolInstance | undefined>;
  listInstances(
    tenant: Readonly<TenantContext>,
  ): Promise<ReadonlyArray<ToolInstance>>;
}

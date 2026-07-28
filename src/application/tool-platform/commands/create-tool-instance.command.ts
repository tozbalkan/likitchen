import { TenantContext } from '../../identity/tenant-context';
import { ToolInstance } from '../domain/tool-instance';
import type { ToolRegistryRepositoryPort } from '../ports/tool-registry-repository-port';

export interface CreateToolInstanceCommand {
  readonly instanceId: string;
  readonly toolId: string;
  readonly version: string;
  readonly credentials?: Readonly<Record<string, string>> | undefined;
  readonly endpointUrl?: string | undefined;
  readonly tenantContext: TenantContext;
}

export class CreateToolInstanceCommandHandler {
  constructor(private readonly repository: ToolRegistryRepositoryPort) {}

  async execute(command: CreateToolInstanceCommand): Promise<ToolInstance> {
    const definition = await this.repository.findDefinitionById(
      command.tenantContext,
      command.toolId,
    );
    if (!definition) {
      throw new Error(
        `[CreateToolInstanceCommandHandler] ToolDefinition '${command.toolId}' not found.`,
      );
    }

    const instance = ToolInstance.create({
      instanceId: command.instanceId,
      toolId: command.toolId,
      tenantId: command.tenantContext.tenantId,
      version: command.version,
      credentials: command.credentials,
      endpointUrl: command.endpointUrl,
      enabled: true,
    });

    await this.repository.saveInstance(command.tenantContext, instance);
    return instance;
  }
}

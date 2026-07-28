import { TenantContext } from '../../identity/tenant-context';
import { ToolInstance } from '../domain/tool-instance';
import type { ToolRegistryRepositoryPort } from '../ports/tool-registry-repository-port';

export interface EnableToolInstanceCommand {
  readonly instanceId: string;
  readonly tenantContext: TenantContext;
}

export class EnableToolInstanceCommandHandler {
  constructor(private readonly repository: ToolRegistryRepositoryPort) {}

  async execute(command: EnableToolInstanceCommand): Promise<ToolInstance> {
    const instance = await this.repository.findInstanceById(
      command.tenantContext,
      command.instanceId,
    );
    if (!instance) {
      throw new Error(
        `[EnableToolInstanceCommandHandler] ToolInstance '${command.instanceId}' not found.`,
      );
    }

    const updated = instance.enable();
    await this.repository.saveInstance(command.tenantContext, updated);
    return updated;
  }
}

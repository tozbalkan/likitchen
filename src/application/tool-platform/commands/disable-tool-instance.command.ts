import { TenantContext } from '../../identity/tenant-context';
import { ToolInstance } from '../domain/tool-instance';
import type { ToolRegistryRepositoryPort } from '../ports/tool-registry-repository-port';

export interface DisableToolInstanceCommand {
  readonly instanceId: string;
  readonly tenantContext: TenantContext;
}

export class DisableToolInstanceCommandHandler {
  constructor(private readonly repository: ToolRegistryRepositoryPort) {}

  async execute(command: DisableToolInstanceCommand): Promise<ToolInstance> {
    const instance = await this.repository.findInstanceById(
      command.tenantContext,
      command.instanceId,
    );
    if (!instance) {
      throw new Error(
        `[DisableToolInstanceCommandHandler] ToolInstance '${command.instanceId}' not found.`,
      );
    }

    const updated = instance.disable();
    await this.repository.saveInstance(command.tenantContext, updated);
    return updated;
  }
}

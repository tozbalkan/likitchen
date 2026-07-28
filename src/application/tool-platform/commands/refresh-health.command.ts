import { TenantContext } from '../../identity/tenant-context';
import { ToolHealthService } from '../services/tool-health-service';
import type { ProviderSelectorService } from '../services/provider-selector-service';
import { ToolHealthStatus } from '../vo/tool-health-status';

export interface RefreshHealthCommand {
  readonly instanceId: string;
  readonly providerName?: string | undefined;
  readonly tenantContext: TenantContext;
}

export class RefreshHealthCommandHandler {
  constructor(
    private readonly healthService: ToolHealthService,
    private readonly providerSelector?: ProviderSelectorService,
  ) {}

  async execute(command: RefreshHealthCommand): Promise<ToolHealthStatus> {
    const driver =
      command.providerName && this.providerSelector
        ? this.providerSelector.getDriver(command.providerName)
        : undefined;

    return this.healthService.refreshInstanceHealth(
      command.tenantContext,
      command.instanceId,
      driver,
    );
  }
}

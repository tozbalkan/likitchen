import { TenantContext } from '../../identity/tenant-context';
import type { ProviderSelectorService } from '../services/provider-selector-service';

export interface CancelExecutionCommand {
  readonly executionId: string;
  readonly provider: string;
  readonly tenantContext: TenantContext;
}

export class CancelExecutionCommandHandler {
  constructor(private readonly providerSelector: ProviderSelectorService) {}

  async execute(command: CancelExecutionCommand): Promise<void> {
    const driver = this.providerSelector.selectDriver(command.provider);
    if (driver.cancel) {
      await driver.cancel(command.executionId);
    }
  }
}

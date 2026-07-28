import { TenantContext } from '../../identity/tenant-context';
import type { ToolRegistryRepositoryPort } from '../ports/tool-registry-repository-port';
import type { ProviderDriverPort } from '../drivers/provider-driver-port';
import { ToolHealthStatus } from '../vo/tool-health-status';

export class ToolHealthService {
  constructor(private readonly repository: ToolRegistryRepositoryPort) {}

  async refreshInstanceHealth(
    tenant: Readonly<TenantContext>,
    instanceId: string,
    driver?: ProviderDriverPort,
  ): Promise<ToolHealthStatus> {
    const instance = await this.repository.findInstanceById(tenant, instanceId);
    if (!instance) {
      throw new Error(
        `[ToolHealthService] ToolInstance '${instanceId}' not found.`,
      );
    }

    let status = ToolHealthStatus.createHealthy(5);
    if (driver && driver.health) {
      const pHealth = await driver.health();
      status = pHealth.isHealthy
        ? ToolHealthStatus.createHealthy(12)
        : new ToolHealthStatus({
            status: 'UNAVAILABLE',
            lastCheckedAt: new Date(),
            message: pHealth.message,
          });
    }

    const updated = instance.updateHealth(status);
    await this.repository.saveInstance(tenant, updated);
    return status;
  }
}

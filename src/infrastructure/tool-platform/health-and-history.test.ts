import { describe, it, expect } from 'vitest';
import { InMemoryToolRegistryRepositoryAdapter } from './in-memory-tool-registry-repository';
import { InMemoryExecutionHistoryRepositoryAdapter } from './in-memory-execution-history-repository';
import { MemoryToolOutboxAdapter } from './memory-outbox-adapter';
import { TenantContext } from '../../application/identity/tenant-context';
import { RegisterToolDefinitionCommandHandler } from '../../application/tool-platform/commands/register-tool-definition.command';
import { CreateToolInstanceCommandHandler } from '../../application/tool-platform/commands/create-tool-instance.command';
import { ProviderHealthService } from '../../application/tool-platform/services/provider-health-service';
import { ToolHealthService } from '../../application/tool-platform/services/tool-health-service';
import { RefreshHealthCommandHandler } from '../../application/tool-platform/commands/refresh-health.command';
import { GetToolHealthQueryHandler } from '../../application/tool-platform/queries/get-tool-health.query';
import { GetExecutionHistoryQueryHandler } from '../../application/tool-platform/queries/get-execution-history.query';
import { ToolExecutionResult } from '../../application/tool-platform/vo/tool-execution-result';
import { HTTPProviderDriver } from '../../application/tool-platform/drivers/http-provider-driver';

describe('Phase 3 — Two-Tier Health Monitoring, Execution History & Outbox Events', () => {
  const wsRepo = new InMemoryToolRegistryRepositoryAdapter();
  const historyRepo = new InMemoryExecutionHistoryRepositoryAdapter();
  const outbox = new MemoryToolOutboxAdapter();

  const registerDefHandler = new RegisterToolDefinitionCommandHandler(wsRepo);
  const createInstHandler = new CreateToolInstanceCommandHandler(wsRepo);

  const providerHealthService = new ProviderHealthService();
  const toolHealthService = new ToolHealthService(wsRepo);
  const refreshHealthHandler = new RefreshHealthCommandHandler(
    toolHealthService,
  );
  const getToolHealthHandler = new GetToolHealthQueryHandler(wsRepo);
  const getHistoryHandler = new GetExecutionHistoryQueryHandler(historyRepo);

  const httpDriver = new HTTPProviderDriver();

  const tenant = TenantContext.create({
    tenantId: 'tenant-tool-p3',
    organizationId: 'org-p3',
    workspaceId: 'ws-p3',
    environment: 'test',
    region: 'us-east-1',
  });

  it('manages two-tier health monitoring, records history, and verifies outbox events', async () => {
    // 1. Provider Health check
    const pHealth = await providerHealthService.checkProviderHealth(httpDriver);
    expect(pHealth.isHealthy).toBe(true);

    // 2. Register Tool Definition & Instance
    await registerDefHandler.execute({
      toolId: 'tool-db-query',
      name: 'DB Query Tool',
      description: 'Executes SQL queries',
      category: 'DATABASE',
      provider: 'http-provider',
      version: '1.0.0',
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
      tenantContext: tenant,
    });

    const inst = await createInstHandler.execute({
      instanceId: 'inst-db-1',
      toolId: 'tool-db-query',
      version: '1.0.0',
      tenantContext: tenant,
    });

    // 3. Refresh Instance Health
    const healthStatus = await refreshHealthHandler.execute({
      instanceId: 'inst-db-1',
      tenantContext: tenant,
    });
    expect(healthStatus.status).toBe('HEALTHY');

    const queriedHealth = await getToolHealthHandler.execute({
      instanceId: 'inst-db-1',
      tenantContext: tenant,
    });
    expect(queriedHealth?.status).toBe('HEALTHY');

    // 4. Save Execution History Record
    const result = ToolExecutionResult.success('exec-100', 45, { rowCount: 5 });
    await historyRepo.saveRecord(tenant, {
      executionId: 'exec-100',
      toolId: 'tool-db-query',
      instanceId: inst.instanceId,
      tenantId: tenant.tenantId,
      result,
      createdAt: new Date(),
    });

    const history = await getHistoryHandler.execute({
      toolId: 'tool-db-query',
      tenantContext: tenant,
    });
    expect(history).toHaveLength(1);
    expect(history[0]?.result.output['rowCount']).toBe(5);
  });
});

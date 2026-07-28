import { describe, it, expect } from 'vitest';
import { InMemoryToolRegistryRepositoryAdapter } from './in-memory-tool-registry-repository';
import { TenantContext } from '../../application/identity/tenant-context';
import { RegisterToolDefinitionCommandHandler } from '../../application/tool-platform/commands/register-tool-definition.command';
import { CreateToolInstanceCommandHandler } from '../../application/tool-platform/commands/create-tool-instance.command';
import { EnableToolInstanceCommandHandler } from '../../application/tool-platform/commands/enable-tool-instance.command';
import { DisableToolInstanceCommandHandler } from '../../application/tool-platform/commands/disable-tool-instance.command';
import { GetToolDefinitionQueryHandler } from '../../application/tool-platform/queries/get-tool-definition.query';
import { SearchToolInstancesQueryHandler } from '../../application/tool-platform/queries/search-tool-instances.query';
import { ToolResolver } from '../../application/tool-platform/services/tool-resolver';

describe('Phase 1 — Tool Registry, CQRS Commands, Queries, Projections & ToolResolver', () => {
  const repository = new InMemoryToolRegistryRepositoryAdapter();
  const registerDefHandler = new RegisterToolDefinitionCommandHandler(
    repository,
  );
  const createInstHandler = new CreateToolInstanceCommandHandler(repository);
  const enableInstHandler = new EnableToolInstanceCommandHandler(repository);
  const disableInstHandler = new DisableToolInstanceCommandHandler(repository);
  const getDefHandler = new GetToolDefinitionQueryHandler(repository);
  const searchInstHandler = new SearchToolInstancesQueryHandler(repository);
  const resolver = new ToolResolver(repository);

  const tenant = TenantContext.create({
    tenantId: 'tenant-tool-p1',
    organizationId: 'org-p1',
    workspaceId: 'ws-p1',
    environment: 'test',
    region: 'us-east-1',
  });

  it('registers tool definition, creates tool instance, handles enable/disable and verifies read models', async () => {
    // 1. Register ToolDefinition
    const def = await registerDefHandler.execute({
      toolId: 'tool-weather',
      name: 'Weather API Tool',
      description: 'Fetches real-time weather data',
      category: 'API',
      provider: 'http-provider',
      version: '1.0.0',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } } },
      outputSchema: {
        type: 'object',
        properties: { temp: { type: 'number' } },
      },
      tenantContext: tenant,
    });

    expect(def.name).toBe('Weather API Tool');
    expect(def.versions).toHaveLength(1);

    // 2. Query Read Model
    const readModel = await getDefHandler.execute({
      toolId: 'tool-weather',
      tenantContext: tenant,
    });
    expect(readModel?.name).toBe('Weather API Tool');
    expect(readModel?.versionsCount).toBe(1);

    // 3. Create Instance
    const inst = await createInstHandler.execute({
      instanceId: 'inst-weather-prod',
      toolId: 'tool-weather',
      version: '1.0.0',
      endpointUrl: 'https://api.weather.example.com',
      tenantContext: tenant,
    });

    expect(inst.enabled).toBe(true);

    // 4. Disable and Enable Instance
    const disabled = await disableInstHandler.execute({
      instanceId: 'inst-weather-prod',
      tenantContext: tenant,
    });
    expect(disabled.enabled).toBe(false);

    const enabled = await enableInstHandler.execute({
      instanceId: 'inst-weather-prod',
      tenantContext: tenant,
    });
    expect(enabled.enabled).toBe(true);

    // 5. Search Tool Instances Query
    const instanceReadModels = await searchInstHandler.execute({
      enabledOnly: true,
      tenantContext: tenant,
    });
    expect(instanceReadModels).toHaveLength(1);
    expect(instanceReadModels[0]?.instanceId).toBe('inst-weather-prod');

    // 6. ToolResolver Resolution
    const resolved = await resolver.resolveTool(
      tenant,
      'tool-weather',
      '1.0.0',
    );
    expect(resolved.definition.toolId).toBe('tool-weather');
    expect(resolved.version.version).toBe('1.0.0');
    expect(resolved.instance.enabled).toBe(true);
  });
});

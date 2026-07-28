import type { ApplicationRegistry } from './application-registry';
import { InMemoryToolRegistryRepositoryAdapter } from '../infrastructure/tool-platform/in-memory-tool-registry-repository';
import { InMemoryExecutionHistoryRepositoryAdapter } from '../infrastructure/tool-platform/in-memory-execution-history-repository';
import { MemoryToolOutboxAdapter } from '../infrastructure/tool-platform/memory-outbox-adapter';
import { ToolResolver } from '../application/tool-platform/services/tool-resolver';
import { ProviderSelectorService } from '../application/tool-platform/services/provider-selector-service';
import { ExecutionIdempotencyService } from '../application/tool-platform/services/execution-idempotency-service';
import { ExecutionResultCache } from '../application/tool-platform/services/execution-result-cache';
import { CircuitBreakerService } from '../application/tool-platform/services/circuit-breaker-service';
import { ToolResultNormalizer } from '../application/tool-platform/services/tool-result-normalizer';
import { ProviderHealthService } from '../application/tool-platform/services/provider-health-service';
import { ToolHealthService } from '../application/tool-platform/services/tool-health-service';
import { ToolExecutionPipeline } from '../application/tool-platform/pipeline/tool-execution-pipeline';
import { MCPProviderDriver } from '../application/tool-platform/drivers/mcp-provider-driver';
import { HTTPProviderDriver } from '../application/tool-platform/drivers/http-provider-driver';

export function registerToolPlatform(registry: ApplicationRegistry): void {
  // Repositories & Adapters
  const toolRepository = new InMemoryToolRegistryRepositoryAdapter();
  const historyRepository = new InMemoryExecutionHistoryRepositoryAdapter();
  const outboxAdapter = new MemoryToolOutboxAdapter();

  registry.register('ToolRegistryRepositoryPort', toolRepository);
  registry.register('ExecutionHistoryRepositoryPort', historyRepository);
  registry.register('ToolOutboxPort', outboxAdapter);

  // Services
  const toolResolver = new ToolResolver(toolRepository);
  const providerSelector = new ProviderSelectorService();
  const idempotencyService = new ExecutionIdempotencyService();
  const resultCache = new ExecutionResultCache();
  const circuitBreaker = new CircuitBreakerService();
  const normalizer = new ToolResultNormalizer();

  const providerHealthService = new ProviderHealthService();
  const toolHealthService = new ToolHealthService(toolRepository);

  // Drivers
  const mcpDriver = new MCPProviderDriver();
  const httpDriver = new HTTPProviderDriver();
  providerSelector.registerDriver(mcpDriver);
  providerSelector.registerDriver(httpDriver);

  registry.register('ToolResolver', toolResolver);
  registry.register('ProviderSelectorService', providerSelector);
  registry.register('ExecutionIdempotencyService', idempotencyService);
  registry.register('ExecutionResultCache', resultCache);
  registry.register('CircuitBreakerService', circuitBreaker);
  registry.register('ToolResultNormalizer', normalizer);
  registry.register('ProviderHealthService', providerHealthService);
  registry.register('ToolHealthService', toolHealthService);

  // Pipeline Execution Runner
  const pipeline = ToolExecutionPipeline.createDefault(
    providerSelector,
    circuitBreaker,
    normalizer,
    outboxAdapter,
  );

  registry.register('ToolExecutionPipeline', pipeline);
}

import type { ApplicationRegistry } from './application-registry';
import type { DeploymentProfile } from '../application/operations/deployment-profile';
import { EnvironmentConfigurationAdapter } from '../infrastructure/config/environment-configuration-adapter';
import { EnvironmentSecretAdapter } from '../infrastructure/secrets/environment-secret-adapter';
import { SilentTelemetryAdapter } from '../infrastructure/telemetry/silent-telemetry-adapter';
import { OpenAiChatAdapter } from '../infrastructure/providers/adapters/openai-chat-adapter';
import { AnthropicChatAdapter } from '../infrastructure/providers/adapters/anthropic-chat-adapter';
import { FallbackChatCompletionAdapter } from '../infrastructure/providers/adapters/fallback-chat-adapter';
import { RetryChatCompletionAdapter } from '../infrastructure/providers/adapters/retry-chat-adapter';
import { TelemetryChatCompletionAdapter } from '../infrastructure/providers/adapters/telemetry-chat-adapter';
import { ApplicationRetryPolicy } from '../application/runtime/application-retry-policy';
import { MetaWhatsAppAdapter } from '../infrastructure/providers/adapters/meta-whatsapp-adapter';
import { FilePromptRepository } from '../infrastructure/prompts/file-prompt-repository';
import { MemoryCircuitBreaker } from '../infrastructure/resilience/memory-circuit-breaker';
import { CircuitBreakerChatCompletionAdapter } from '../infrastructure/resilience/circuit-breaker-adapter';
import { MemoryRateLimiter } from '../infrastructure/resilience/memory-rate-limiter';
import { TimeoutChatCompletionAdapter } from '../infrastructure/resilience/timeout-chat-adapter';
import { RateLimiterChatCompletionAdapter } from '../infrastructure/resilience/rate-limiter-adapter';
import { StaticPricingCatalogAdapter } from '../infrastructure/intelligence/static-pricing-catalog';
import { MemoryCostAccountingAdapter } from '../infrastructure/intelligence/memory-cost-accounting';
import { MemoryPermissionEvaluatorAdapter } from '../infrastructure/identity/memory-permission-evaluator';
import { MemoryQuotaManagerAdapter } from '../infrastructure/identity/memory-quota-manager';
import { TenantPartitionedReplayStoreAdapter } from '../infrastructure/identity/tenant-partitioned-replay-store';
import { MemoryToolRegistryAdapter } from '../infrastructure/agent/memory-tool-registry';
import { ToolExecutorAdapter } from '../infrastructure/agent/tool-executor';
import { ProviderDiscoveryAndSelectionAdapter } from '../infrastructure/agent/provider-selector';
import { JsonSchemaOutputValidatorAdapter } from '../infrastructure/agent/structured-output-validator';
import { InMemoryAgentMemoryAdapter } from '../infrastructure/agent/memory/in-memory-agent-memory';
import { registerPromptPlatform } from './register-prompt-platform';
import { registerPromptAuthoring } from './register-prompt-authoring';
import { registerToolPlatform } from './register-tool-platform';
import { registerPlanningOrchestration } from './register-planning-orchestration';
import { registerMemoryKnowledgePlatform } from './register-memory-knowledge-platform';

export function registerProviders(
  registry: ApplicationRegistry,
  profile: DeploymentProfile,
): void {
  // 1. Config & Secrets
  const configAdapter = new EnvironmentConfigurationAdapter();
  const secretAdapter = new EnvironmentSecretAdapter();

  registry.register('ConfigurationAdapter', configAdapter);
  registry.register('SecretAdapter', secretAdapter);

  // 2. Telemetry & Resilience Services — driven by DeploymentProfile
  const telemetryAdapter = new SilentTelemetryAdapter();
  const retryPolicy = new ApplicationRetryPolicy({
    maxAttempts: profile.retryMaxAttempts,
    backoffMs: profile.retryBackoffMs,
  });
  const rateLimiter = new MemoryRateLimiter();

  registry.register('TelemetryPort', telemetryAdapter);
  registry.register('RetryPolicy', retryPolicy);
  registry.register('RateLimiter', rateLimiter);

  // 3. Per-Provider Circuit Breakers
  const openAiBreaker = new MemoryCircuitBreaker('openai');
  const anthropicBreaker = new MemoryCircuitBreaker('anthropic');

  const openAiAdapter = new OpenAiChatAdapter();
  const anthropicAdapter = new AnthropicChatAdapter();

  const openAiWithBreaker = new CircuitBreakerChatCompletionAdapter(
    openAiAdapter,
    openAiBreaker,
  );
  const anthropicWithBreaker = new CircuitBreakerChatCompletionAdapter(
    anthropicAdapter,
    anthropicBreaker,
  );

  // 4. Final LLM Decorator Chain Order:
  // Telemetry -> RateLimiter -> Timeout -> Retry -> Fallback -> ProviderCircuitBreaker -> Target Provider
  const fallbackDecorator = new FallbackChatCompletionAdapter([
    openAiWithBreaker,
    anthropicWithBreaker,
  ]);
  const retryDecorator = new RetryChatCompletionAdapter(
    fallbackDecorator,
    retryPolicy,
  );
  const timeoutDecorator = new TimeoutChatCompletionAdapter(
    retryDecorator,
    profile.timeoutMs,
  );
  const rateLimiterDecorator = new RateLimiterChatCompletionAdapter(
    timeoutDecorator,
    rateLimiter,
  );
  const telemetryDecorator = new TelemetryChatCompletionAdapter(
    rateLimiterDecorator,
    telemetryAdapter,
  );

  registry.register('PrimaryChatAdapter', openAiAdapter);
  registry.register('FallbackChatAdapter', fallbackDecorator);
  registry.register('RetryChatAdapter', retryDecorator);
  registry.register('TimeoutChatAdapter', timeoutDecorator);
  registry.register('RateLimiterChatAdapter', rateLimiterDecorator);
  registry.register('ChatCompletionPort', telemetryDecorator);

  // 5. Messaging, Prompts, Intelligence & Identity Adapters
  const whatsAppAdapter = new MetaWhatsAppAdapter();
  const promptRepository = new FilePromptRepository();
  const pricingCatalog = new StaticPricingCatalogAdapter();
  const costAccounting = new MemoryCostAccountingAdapter(pricingCatalog);
  const permissionEvaluator = new MemoryPermissionEvaluatorAdapter();
  const quotaManager = new MemoryQuotaManagerAdapter();
  const replayStore = new TenantPartitionedReplayStoreAdapter();

  registry.register('MessageDeliveryPort', whatsAppAdapter);
  registry.register('PromptRepositoryPort', promptRepository);
  registry.register('PricingCatalogPort', pricingCatalog);
  registry.register('CostAccountingPort', costAccounting);
  registry.register('PermissionEvaluatorPort', permissionEvaluator);
  registry.register('QuotaManagerPort', quotaManager);
  registry.register('TenantReplayStore', replayStore);

  // 6. Agent Infrastructure Adapters
  const toolRegistry = new MemoryToolRegistryAdapter();
  const toolExecutor = new ToolExecutorAdapter(toolRegistry);
  const providerSelectorAdapter = new ProviderDiscoveryAndSelectionAdapter([
    'openai',
    'anthropic',
  ]);
  const outputValidator = new JsonSchemaOutputValidatorAdapter();
  const agentMemoryAdapter = new InMemoryAgentMemoryAdapter();

  registry.register('ToolResolverPort', toolRegistry);
  registry.register('ToolExecutorPort', toolExecutor);
  registry.register('ProviderDiscoveryPort', providerSelectorAdapter);
  registry.register('ProviderSelectorPort', providerSelectorAdapter);
  registry.register('StructuredOutputValidatorPort', outputValidator);
  registry.register('ConversationMemoryPort', agentMemoryAdapter);
  registry.register('SemanticMemoryPort', agentMemoryAdapter);
  registry.register('WorkingMemoryPort', agentMemoryAdapter);

  // 7. Platform Assemblies (Prompts, Tools, Planning Orchestration, Memory & Knowledge)
  registerPromptPlatform(registry);
  registerPromptAuthoring(registry);
  registerToolPlatform(registry);
  registerPlanningOrchestration(registry);
  registerMemoryKnowledgePlatform(registry);
}

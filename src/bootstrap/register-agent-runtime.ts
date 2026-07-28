import type { ApplicationRegistry } from './application-registry';
import { ExecutionPipelineBuilder } from '../application/agent/execution-pipeline';
import { AgentRuntime } from '../application/agent/agent-runtime';
import { AgentRunner } from '../application/agent/agent-runner';
import { ContextStage } from '../application/agent/stages/context-stage';
import { GuardStage } from '../application/agent/stages/guard-stage';
import { PromptStage } from '../application/agent/stages/prompt-stage';
import { MemoryStage } from '../application/agent/stages/memory-stage';
import { ToolStage } from '../application/agent/stages/tool-stage';
import { ProviderStage } from '../application/agent/stages/provider-stage';
import { DispatchStage } from '../application/agent/stages/dispatch-stage';
import { ValidationStage } from '../application/agent/stages/validation-stage';
import { TelemetryStage } from '../application/agent/stages/telemetry-stage';
import type { PromptResolverPort } from '../application/agent/ports/prompt-resolver-port';
import type { ConversationMemoryPort } from '../application/agent/ports/conversation-memory-port';
import type { ToolResolverPort } from '../application/agent/ports/tool-resolver-port';
import type { ProviderDiscoveryPort } from '../application/agent/ports/provider-discovery-port';
import type { ProviderSelectorPort } from '../application/agent/ports/provider-selector-port';
import type { ChatCompletionPort } from '../application/ports/ai/chat-completion-port';
import type { StructuredOutputValidatorPort } from '../application/agent/ports/structured-output-validator-port';
import type { TenantPartitionedReplayStoreAdapter } from '../infrastructure/identity/tenant-partitioned-replay-store';
import type { CostAccountingPort } from '../application/intelligence/cost/cost-accounting-port';
import type { TelemetryPort } from '../application/telemetry/telemetry-port';

export function registerAgentRuntime(registry: ApplicationRegistry): void {
  const promptResolver =
    registry.resolve<PromptResolverPort>('PromptResolverPort');
  const memoryPort = registry.resolve<ConversationMemoryPort>(
    'ConversationMemoryPort',
  );
  const toolResolver = registry.resolve<ToolResolverPort>('ToolResolverPort');
  const providerDiscovery = registry.resolve<ProviderDiscoveryPort>(
    'ProviderDiscoveryPort',
  );
  const providerSelector = registry.resolve<ProviderSelectorPort>(
    'ProviderSelectorPort',
  );
  const chatPort = registry.resolve<ChatCompletionPort>('ChatCompletionPort');
  const validator = registry.resolve<StructuredOutputValidatorPort>(
    'StructuredOutputValidatorPort',
  );
  const replayStore =
    registry.resolve<TenantPartitionedReplayStoreAdapter>('TenantReplayStore');
  const costAccounting =
    registry.resolve<CostAccountingPort>('CostAccountingPort');
  const telemetryPort = registry.resolve<TelemetryPort>('TelemetryPort');

  // Build standard 9-stage pipeline
  const pipeline = new ExecutionPipelineBuilder()
    .addStage(new ContextStage())
    .addStage(new GuardStage())
    .addStage(new PromptStage(promptResolver))
    .addStage(new MemoryStage(memoryPort))
    .addStage(new ToolStage(toolResolver))
    .addStage(new ProviderStage(providerDiscovery, providerSelector))
    .addStage(new DispatchStage(chatPort))
    .addStage(new ValidationStage(validator))
    .addStage(new TelemetryStage(telemetryPort))
    .build();

  const agentRuntime = new AgentRuntime(
    pipeline,
    replayStore,
    costAccounting,
    telemetryPort,
  );
  const agentRunner = new AgentRunner(agentRuntime);

  registry.register('ExecutionPipeline', pipeline);
  registry.register('AgentRuntime', agentRuntime);
  registry.register('AgentRunner', agentRunner);
}

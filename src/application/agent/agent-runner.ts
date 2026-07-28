import type { AgentDefinition } from './agent-definition';
import type { AgentRuntime } from './agent-runtime';
import { ExecutionPlan } from './runtime/execution-plan';
import { StageContext } from './execution-stage';
import type { ExecutionContext } from '../context/execution-context';
import type { TenantContext } from '../identity/tenant-context';
import { CancellationToken } from './cancellation-token';
import type { ExecutionResult } from './runtime/execution-result';

export class AgentRunner {
  constructor(private readonly runtime: AgentRuntime) {}

  async run(
    agentDefinition: Readonly<AgentDefinition>,
    executionContext: Readonly<ExecutionContext>,
    tenantContext: Readonly<TenantContext>,
    userMessage: string,
    cancellationToken = new CancellationToken(),
  ): Promise<ExecutionResult> {
    // 1. Build pure data ExecutionPlan
    const plan = ExecutionPlan.create({
      planId: `plan-${Date.now()}`,
      agentId: agentDefinition.id,
      providerId: 'openai',
      model: 'gpt-4o',
      toolIds: agentDefinition.toolIds,
      promptReference: agentDefinition.systemPromptReference,
      timeoutMs: agentDefinition.timeoutMs ?? 5000,
      retryMaxAttempts: 3,
      tenantId: tenantContext.tenantId,
      featureFlags: {},
      createdAt: new Date(),
    });

    // 2. Create initial StageContext
    const initialContext = StageContext.create({
      executionContext,
      tenantContext,
      cancellationToken,
      plan,
      userMessage,
      metadata: {
        outputSchema: agentDefinition.outputSchema,
      },
    });

    // 3. Execute via AgentRuntime kernel
    return await this.runtime.execute(initialContext);
  }
}

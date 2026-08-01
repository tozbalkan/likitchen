import type { TenantContext } from '../../identity/tenant-context';
import type { AgentDescriptor } from '../vo/agent-descriptor';
import type { SwarmConsensusResult } from '../vo/swarm-consensus-result';
import type { SwarmConcurrencyPolicy } from '../vo/swarm-concurrency-policy';
import type { SwarmConsensusPolicy } from '../vo/swarm-consensus-policy';
import type { SwarmFailurePolicy } from '../vo/swarm-failure-policy';

export interface SwarmTaskNode {
  readonly taskId: string;
  readonly prompt: string;
  readonly agent: AgentDescriptor;
  readonly dependencies?: readonly string[] | undefined;
}

export interface SwarmTaskRequest {
  readonly swarmId: string;
  readonly goalPrompt: string;
  readonly tasks: readonly SwarmTaskNode[];
  readonly concurrencyPolicy?: SwarmConcurrencyPolicy | undefined;
  readonly consensusPolicy?: SwarmConsensusPolicy | undefined;
  readonly failurePolicy?: SwarmFailurePolicy | undefined;
}

export interface SwarmOrchestrationOptions {
  readonly signal?: AbortSignal | undefined;
}

export interface SwarmOrchestratorPort {
  orchestrateSwarm(
    tenantContext: TenantContext,
    request: SwarmTaskRequest,
    options?: SwarmOrchestrationOptions | undefined,
  ): Promise<SwarmConsensusResult>;
}

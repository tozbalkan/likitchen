import { describe, it, expect } from 'vitest';
import { SwarmOrchestratorService } from './swarm-orchestrator-service';
import { AgentDescriptor } from '../vo/agent-descriptor';
import { SwarmConcurrencyPolicy } from '../vo/swarm-concurrency-policy';
import { SwarmConsensusPolicy } from '../vo/swarm-consensus-policy';
import { SwarmFailurePolicy } from '../vo/swarm-failure-policy';
import { TenantContext } from '../../identity/tenant-context';
import type { ReasoningEnginePort } from '../../agent/ports/reasoning-engine-port';
import {
  ReActCycleResult,
  type ReasoningSessionId,
} from '../../agent/vo/react-cycle-result';

describe('SwarmOrchestratorService Application Service (Capability-029 Step 2)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-swarm-test',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const mockReasoningEngine: ReasoningEnginePort = {
    async executeCycle() {
      return ReActCycleResult.create({
        sessionId: 'sess-swarm-1' as ReasoningSessionId,
        finishReason: 'COMPLETED',
        steps: [],
        totalDurationMs: 50,
      });
    },
  };

  const agentA = AgentDescriptor.create({
    agentId: 'agent-A',
    role: 'Researcher',
  });
  const agentB = AgentDescriptor.create({ agentId: 'agent-B', role: 'Writer' });

  it('1. orchestrateSwarm executes DAG tasks and produces canonical sorted consensus', async () => {
    const service = new SwarmOrchestratorService({
      reasoningEngine: mockReasoningEngine,
    });
    const result = await service.orchestrateSwarm(tenant, {
      swarmId: 'swarm-100',
      goalPrompt: 'Research and write article',
      tasks: [
        { taskId: 'task-1', prompt: 'Research AI trends', agent: agentA },
        {
          taskId: 'task-2',
          prompt: 'Write draft',
          agent: agentB,
          dependencies: ['task-1'],
        },
      ],
    });

    expect(result.participatingAgents).toEqual(['agent-A', 'agent-B']);
    expect(result.aggregatedConfidence).toBeGreaterThan(0.0);
  });

  it('2. Propagates cascading AbortSignal cancellation when cancelled', async () => {
    const slowEngine: ReasoningEnginePort = {
      async executeCycle(_tenant, _req) {
        await new Promise((resolve) => setTimeout(resolve, 300));
        return ReActCycleResult.create({
          sessionId: 'sess-slow' as ReasoningSessionId,
          finishReason: 'COMPLETED',
          steps: [],
          totalDurationMs: 300,
        });
      },
    };

    const service = new SwarmOrchestratorService({
      reasoningEngine: slowEngine,
    });
    const concurrencyPolicy = SwarmConcurrencyPolicy.create({
      swarmTimeoutMs: 100,
    }); // Timeout quickly

    await expect(
      service.orchestrateSwarm(tenant, {
        swarmId: 'swarm-timeout',
        goalPrompt: 'Timeout test',
        concurrencyPolicy,
        tasks: [{ taskId: 't1', prompt: 'Slow task', agent: agentA }],
      }),
    ).rejects.toThrow('Swarm execution cancelled or timed out.');
  });

  it('3. Enforces SwarmFailurePolicy HALT_SWARM when minimum successful agents is not met', async () => {
    const failingEngine: ReasoningEnginePort = {
      async executeCycle() {
        throw new Error('Agent execution failed');
      },
    };

    const service = new SwarmOrchestratorService({
      reasoningEngine: failingEngine,
    });
    const consensusPolicy = SwarmConsensusPolicy.create({
      minimumSuccessfulAgents: 1,
    });
    const failurePolicy = SwarmFailurePolicy.create({
      failureAction: 'HALT_SWARM',
    });

    await expect(
      service.orchestrateSwarm(tenant, {
        swarmId: 'swarm-fail',
        goalPrompt: 'Failing goal',
        consensusPolicy,
        failurePolicy,
        tasks: [{ taskId: 't1', prompt: 'Fail task', agent: agentA }],
      }),
    ).rejects.toThrow('Swarm failed to reach minimum successful agents');
  });
});

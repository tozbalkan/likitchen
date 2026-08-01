import { describe, it, expect } from 'vitest';
import { SwarmOrchestratorService } from '../../application/swarm/services/swarm-orchestrator-service';
import { AgentDescriptor } from '../../application/swarm/vo/agent-descriptor';
import { SwarmConcurrencyPolicy } from '../../application/swarm/vo/swarm-concurrency-policy';
import { TenantContext } from '../../application/identity/tenant-context';
import type { ReasoningEnginePort } from '../../application/agent/ports/reasoning-engine-port';
import {
  ReActCycleResult,
  type ReasoningSessionId,
} from '../../application/agent/vo/react-cycle-result';

describe('Swarm Orchestrator Contract Suite (Capability-029)', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-swarm-contract',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const mockReasoningEngine: ReasoningEnginePort = {
    async executeCycle() {
      return ReActCycleResult.create({
        sessionId: 'sess-swarm-contract' as ReasoningSessionId,
        finishReason: 'COMPLETED',
        steps: [],
        totalDurationMs: 50,
      });
    },
  };

  const agent1 = AgentDescriptor.create({
    agentId: 'agent-1',
    role: 'Analyzer',
  });
  const agent2 = AgentDescriptor.create({
    agentId: 'agent-2',
    role: 'Synthesizer',
  });

  it('1. [Contract] SwarmOrchestratorService executes worker agents and produces ordered consensus result', async () => {
    const orchestrator = new SwarmOrchestratorService({
      reasoningEngine: mockReasoningEngine,
    });
    const result = await orchestrator.orchestrateSwarm(tenant, {
      swarmId: 'swarm-contract-100',
      goalPrompt: 'Perform competitive analysis',
      tasks: [
        { taskId: 'task-1', prompt: 'Analyze competitors', agent: agent1 },
        {
          taskId: 'task-2',
          prompt: 'Synthesize findings',
          agent: agent2,
          dependencies: ['task-1'],
        },
      ],
    });

    expect(result.participatingAgents).toEqual(['agent-1', 'agent-2']);
    expect(result.aggregatedConfidence).toBeGreaterThan(0.0);
    expect(result.finalOutput).toContain('[agent-1]');
    expect(result.finalOutput).toContain('[agent-2]');
  });

  it('2. [Contract] Propagates cascading AbortSignal cancellation when swarm times out', async () => {
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

    const orchestrator = new SwarmOrchestratorService({
      reasoningEngine: slowEngine,
    });
    const concurrencyPolicy = SwarmConcurrencyPolicy.create({
      swarmTimeoutMs: 100,
    });

    await expect(
      orchestrator.orchestrateSwarm(tenant, {
        swarmId: 'swarm-timeout-contract',
        goalPrompt: 'Timeout test',
        concurrencyPolicy,
        tasks: [{ taskId: 't1', prompt: 'Slow task', agent: agent1 }],
      }),
    ).rejects.toThrow('Swarm execution cancelled or timed out.');
  });
});

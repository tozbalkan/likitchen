import { describe, it, expect } from 'vitest';
import { AgentDescriptor } from './agent-descriptor';
import { SwarmAgentResult } from './swarm-agent-result';
import { SwarmConsensusResult } from './swarm-consensus-result';
import { SwarmConcurrencyPolicy } from './swarm-concurrency-policy';
import { SwarmConsensusPolicy } from './swarm-consensus-policy';

describe('Capability-029 Step 1 — Swarm Domain VOs & Policies', () => {
  it('1. Creates immutable AgentDescriptor VO', () => {
    const agent = AgentDescriptor.create({
      agentId: 'agent-researcher',
      role: 'Researcher',
      capabilities: ['web-search', 'fact-check'],
    });

    expect(agent.agentId).toBe('agent-researcher');
    expect(agent.role).toBe('Researcher');
    expect(agent.capabilities).toEqual(['web-search', 'fact-check']);
    expect(Object.isFrozen(agent)).toBe(true);
  });

  it('2. Creates immutable SwarmAgentResult with delegationIndex and validated confidenceScore', () => {
    const result = SwarmAgentResult.create({
      agentId: 'agent-1',
      delegationIndex: 0,
      output: 'Summary findings',
      confidenceScore: 0.95,
    });

    expect(result.agentId).toBe('agent-1');
    expect(result.delegationIndex).toBe(0);
    expect(result.confidenceScore).toBe(0.95);
    expect(Object.isFrozen(result)).toBe(true);

    expect(() =>
      SwarmAgentResult.create({
        agentId: 'agent-1',
        delegationIndex: 0,
        output: 'Summary',
        confidenceScore: 1.5,
      }),
    ).toThrow(
      '[SwarmAgentResult] confidenceScore must be between 0.0 and 1.0.',
    );
  });

  it('3. Creates immutable SwarmConsensusResult and validates confidence bounds', () => {
    const consensus = SwarmConsensusResult.create({
      finalOutput: 'Agreed consensus',
      aggregatedConfidence: 0.9,
      participatingAgents: ['agent-1', 'agent-2'],
    });

    expect(consensus.finalOutput).toBe('Agreed consensus');
    expect(consensus.aggregatedConfidence).toBe(0.9);
    expect(Object.isFrozen(consensus)).toBe(true);
  });

  it('4. Creates SwarmConcurrencyPolicy and SwarmConsensusPolicy with defaults', () => {
    const concurrency = SwarmConcurrencyPolicy.default();
    expect(concurrency.maxConcurrentAgents).toBe(4);
    expect(concurrency.swarmTimeoutMs).toBe(30000);

    const consensusPolicy = SwarmConsensusPolicy.default();
    expect(consensusPolicy.minimumParticipants).toBe(1);
    expect(consensusPolicy.failureAction).toBe('QUORUM_DEGRADED_OK');
  });
});

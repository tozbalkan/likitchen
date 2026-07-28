import { describe, it, expect } from 'vitest';
import { ReplayRunner } from './replay-runner';
import { ReplaySession, type ReplaySnapshot } from './replay-session';

describe('ReplayRunner', () => {
  it('reconstructs deterministic provider results from replay session snapshots', async () => {
    const runner = new ReplayRunner();
    const snapshot1: ReplaySnapshot = {
      sessionId: 'sess-123',
      turnId: 'turn-1',
      promptFingerprint: 'fp-1',
      providerResult: {
        value: 'Response 1',
        metadata: {
          providerId: 'openai',
          model: 'gpt-4o',
          promptFingerprint: 'fp-1',
        },
      },
      recordedAt: new Date(),
    };

    const session = new ReplaySession('sess-123', [snapshot1]);
    const results = await runner.runReplay(session);

    expect(results.length).toBe(1);
    expect(results[0]?.value).toBe('Response 1');
  });
});

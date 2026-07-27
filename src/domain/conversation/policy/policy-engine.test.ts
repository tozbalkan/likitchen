import { describe, it, expect } from 'vitest';
import { PolicyEngine } from './policy-engine';
import { PolicyRegistry } from './policy-registry';
import type { ConversationPolicy } from './conversation-policy';
import type { PolicyContext } from './policy-context';
import { ok } from '../../../shared/result';
import type { PolicyResult } from './policy-result';
import type { ConversationAssessment } from '../recommendation';
import type { ConversationFacts } from '../conversation-facts';

describe('Policy Engine & Registry', () => {
  const dummyContext: PolicyContext = {
    state: {} as never,
    facts: {} as never as ConversationFacts,
    assessment: {} as never as ConversationAssessment,
  };

  it('should register and retrieve policies', () => {
    const registry = new PolicyRegistry();
    const mockPolicy: ConversationPolicy<unknown, unknown> = {
      name: 'MockPolicy',
      version: '1.0.0',
      evaluate: () =>
        ok({ decision: true, explanations: [], policyVersion: '1.0.0' }),
    };

    registry.register(mockPolicy);

    const result = registry.getPolicy<PolicyContext, PolicyResult<boolean>>(
      'MockPolicy',
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.name).toBe('MockPolicy');
    }
  });

  it('should enforce unique policy registration', () => {
    const registry = new PolicyRegistry();
    const mockPolicy: ConversationPolicy<unknown, unknown> = {
      name: 'MockPolicy',
      version: '1.0.0',
      evaluate: () =>
        ok({ decision: true, explanations: [], policyVersion: '1.0.0' }),
    };

    registry.register(mockPolicy);
    expect(() => registry.register(mockPolicy)).toThrow(
      'Policy MockPolicy is already registered.',
    );
  });

  it('should evaluate a policy successfully via the engine', () => {
    const engine = new PolicyEngine();
    const mockPolicy: ConversationPolicy<
      PolicyContext,
      PolicyResult<boolean>
    > = {
      name: 'MockPolicy',
      version: '1.0.0',
      evaluate: () =>
        ok({ decision: true, explanations: [], policyVersion: '1.0.0' }),
    };

    const result = engine.evaluate(mockPolicy, dummyContext);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.decision).toBe(true);
    }
  });
});

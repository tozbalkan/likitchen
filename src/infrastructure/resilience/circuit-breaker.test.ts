import { describe, it, expect, vi } from 'vitest';
import {
  MemoryCircuitBreaker,
  CircuitBreakerOpenException,
} from './memory-circuit-breaker';
import { CircuitBreakerState } from '../../application/resilience/circuit-breaker-port';

describe('MemoryCircuitBreaker FSM', () => {
  it('starts in CLOSED state and passes calls', async () => {
    const breaker = new MemoryCircuitBreaker('test-provider', 2, 100);
    expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);

    const result = await breaker.execute(async () => 'success');
    expect(result).toBe('success');
  });

  it('transitions to OPEN state after hitting failure threshold', async () => {
    const breaker = new MemoryCircuitBreaker('test-provider', 2, 100);

    // Failure 1
    await expect(
      breaker.execute(async () => {
        throw new Error('fail 1');
      }),
    ).rejects.toThrow('fail 1');
    expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);

    // Failure 2 -> Threshold reached -> OPEN
    await expect(
      breaker.execute(async () => {
        throw new Error('fail 2');
      }),
    ).rejects.toThrow('fail 2');
    expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

    // Subsequent call immediately rejected without running target function
    const targetSpy = vi.fn();
    await expect(breaker.execute(targetSpy)).rejects.toThrow(
      CircuitBreakerOpenException,
    );
    expect(targetSpy).not.toHaveBeenCalled();
  });

  it('transitions to HALF_OPEN after cooldown and resets to CLOSED on success', async () => {
    const breaker = new MemoryCircuitBreaker('test-provider', 1, 50);

    // Trigger OPEN
    await expect(
      breaker.execute(async () => {
        throw new Error('fail');
      }),
    ).rejects.toThrow();
    expect(breaker.getState()).toBe(CircuitBreakerState.OPEN);

    // Wait for cooldown
    await new Promise((resolve) => setTimeout(resolve, 60));

    expect(breaker.getState()).toBe(CircuitBreakerState.HALF_OPEN);

    // Successful execution in HALF_OPEN resets breaker to CLOSED
    const result = await breaker.execute(async () => 'recovered');
    expect(result).toBe('recovered');
    expect(breaker.getState()).toBe(CircuitBreakerState.CLOSED);
  });
});

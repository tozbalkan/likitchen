import { describe, it, expect } from 'vitest';
import { ConstantBackoff, ExponentialBackoff } from './backoff-policy';
import { TransientErrorRetryDecisionPolicy } from './retry-decision-policy';
import { RetryPolicy } from './retry-policy';
import { CircuitBreakerPolicy } from './circuit-breaker-policy';
import { ToolValidationError } from '../errors/tool-execution-error';
import type { ToolId } from './tool-definition';
import type { InvocationId } from './tool-invocation';

describe('Capability-027 Iteration 4 Step 1 — Resilience VOs & Decision Policies', () => {
  it('calculates deterministic delays with ConstantBackoff & ExponentialBackoff', () => {
    const constant = new ConstantBackoff(250);
    expect(constant.getDelayMs(1)).toBe(250);
    expect(constant.getDelayMs(3)).toBe(250);

    const expo = new ExponentialBackoff(100, 2, 1000);
    expect(expo.getDelayMs(1)).toBe(100);
    expect(expo.getDelayMs(2)).toBe(200);
    expect(expo.getDelayMs(3)).toBe(400);
    expect(expo.getDelayMs(10)).toBe(1000); // Capped at maxDelayMs
  });

  it('correctly identifies retryable vs non-retryable errors in TransientErrorRetryDecisionPolicy', () => {
    const policy = new TransientErrorRetryDecisionPolicy();

    // 1. Retryable transient errors
    expect(policy.shouldRetry({ status: 503 }, 1)).toBe(true);
    expect(policy.shouldRetry({ status: 429 }, 1)).toBe(true);
    expect(policy.shouldRetry({ code: 'ECONNRESET' }, 1)).toBe(true);
    expect(
      policy.shouldRetry({ message: 'Network connection timeout' }, 1),
    ).toBe(true);

    // 2. Non-retryable errors
    expect(policy.shouldRetry({ status: 400 }, 1)).toBe(false);
    expect(policy.shouldRetry({ status: 401 }, 1)).toBe(false);
    const validationErr = new ToolValidationError(
      'tool-1' as ToolId,
      'inv-1' as InvocationId,
      ['Invalid input'],
    );
    expect(policy.shouldRetry(validationErr, 1)).toBe(false);
  });

  it('creates immutable RetryPolicy & CircuitBreakerPolicy VOs', () => {
    const retry = RetryPolicy.create({ maxAttempts: 3 });
    expect(retry.maxAttempts).toBe(3);
    expect(Object.isFrozen(retry)).toBe(true);

    const cb = CircuitBreakerPolicy.create({
      failureThreshold: 5,
      resetTimeoutMs: 15000,
    });
    expect(cb.failureThreshold).toBe(5);
    expect(cb.resetTimeoutMs).toBe(15000);
    expect(Object.isFrozen(cb)).toBe(true);
  });
});

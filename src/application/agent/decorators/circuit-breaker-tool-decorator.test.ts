import { describe, it, expect } from 'vitest';
import { CircuitBreakerToolDecorator } from './circuit-breaker-tool-decorator';
import { CircuitBreakerPolicy } from '../vo/circuit-breaker-policy';
import { TenantContext } from '../../identity/tenant-context';
import { ToolInvocation, type InvocationId } from '../vo/tool-invocation';
import { ToolArguments } from '../vo/tool-arguments';
import { ToolResult } from '../vo/tool-result';
import { ToolUnavailableError } from '../errors/tool-execution-error';
import { ToolDefinition, type ToolId } from '../vo/tool-definition';
import { ToolSchema } from '../vo/tool-schema';
import type { ToolExecutionPort } from '../ports/tool-execution-port';
import type { CorrelationId } from '../../../shared/types';
import type { ClockPort } from '../../ports/clock/clock-port';

class TestClock implements ClockPort {
  private currentTime = 1000;

  now(): Date {
    return new Date(this.currentTime);
  }

  advance(ms: number): void {
    this.currentTime += ms;
  }
}

describe('CircuitBreakerToolDecorator Application Decorator', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-cb-test',
    organizationId: 'org-1',
    workspaceId: 'ws-1',
    environment: 'test',
    region: 'us-east-1',
  });

  const toolId = 'tool-api' as ToolId;
  const mockDefinition = ToolDefinition.create({
    toolId,
    displayName: 'API Tool',
    description: 'API Tool Test',
    version: '1.0.0',
    inputSchema: ToolSchema.empty(),
  });

  const invocation = ToolInvocation.create({
    invocationId: 'inv-101' as InvocationId,
    toolId,
    arguments: ToolArguments.empty(),
    correlationId: 'corr-1' as CorrelationId,
  });

  it('1. Remains CLOSED under failureThreshold and resets failure count on success', async () => {
    let attempts = 0;
    const clock = new TestClock();

    const innerPort: ToolExecutionPort = {
      toolId,
      definition: mockDefinition,
      async execute() {
        attempts++;
        if (attempts === 1) {
          return ToolResult.create({
            invocationId: invocation.invocationId,
            toolId,
            status: 'failure',
            output: '500 Error',
            executionTimeMs: 5,
          });
        }
        return ToolResult.create({
          invocationId: invocation.invocationId,
          toolId,
          status: 'success',
          output: 'OK',
          executionTimeMs: 5,
        });
      },
    };

    const policy = CircuitBreakerPolicy.create({
      failureThreshold: 3,
      resetTimeoutMs: 10000,
    });
    const decorator = new CircuitBreakerToolDecorator({
      inner: innerPort,
      policy,
      clock,
    });

    expect(decorator.currentState).toBe('CLOSED');
    await decorator.execute(tenant, invocation);
    expect(decorator.failureCount).toBe(1);
    expect(decorator.currentState).toBe('CLOSED');

    await decorator.execute(tenant, invocation);
    expect(decorator.failureCount).toBe(0);
    expect(decorator.currentState).toBe('CLOSED');
  });

  it('2. Transitions to OPEN when consecutive failures reach failureThreshold', async () => {
    const clock = new TestClock();
    const innerPort: ToolExecutionPort = {
      toolId,
      definition: mockDefinition,
      async execute() {
        return ToolResult.create({
          invocationId: invocation.invocationId,
          toolId,
          status: 'failure',
          output: 'Down',
          executionTimeMs: 1,
        });
      },
    };

    const policy = CircuitBreakerPolicy.create({
      failureThreshold: 3,
      resetTimeoutMs: 10000,
    });
    const decorator = new CircuitBreakerToolDecorator({
      inner: innerPort,
      policy,
      clock,
    });

    await decorator.execute(tenant, invocation); // 1
    await decorator.execute(tenant, invocation); // 2
    expect(decorator.currentState).toBe('CLOSED');

    await decorator.execute(tenant, invocation); // 3 -> threshold reached
    expect(decorator.currentState).toBe('OPEN');

    // Subsequent call rejected immediately with ToolUnavailableError
    await expect(decorator.execute(tenant, invocation)).rejects.toThrow(
      ToolUnavailableError,
    );
  });

  it('3. Transitions OPEN -> HALF_OPEN after resetTimeoutMs and closes on trial success', async () => {
    const clock = new TestClock();
    let failMode = true;

    const innerPort: ToolExecutionPort = {
      toolId,
      definition: mockDefinition,
      async execute() {
        if (failMode) {
          throw new Error('Server down');
        }
        return ToolResult.create({
          invocationId: invocation.invocationId,
          toolId,
          status: 'success',
          output: 'Recovered',
          executionTimeMs: 2,
        });
      },
    };

    const policy = CircuitBreakerPolicy.create({
      failureThreshold: 2,
      resetTimeoutMs: 5000,
    });
    const decorator = new CircuitBreakerToolDecorator({
      inner: innerPort,
      policy,
      clock,
    });

    // Fail twice to open circuit
    await expect(decorator.execute(tenant, invocation)).rejects.toThrow();
    await expect(decorator.execute(tenant, invocation)).rejects.toThrow();
    expect(decorator.currentState).toBe('OPEN');

    // Advance clock past resetTimeoutMs (5000ms)
    clock.advance(6000);
    failMode = false; // System recovered

    // Next call triggers HALF_OPEN trial
    const result = await decorator.execute(tenant, invocation);
    expect(result.output).toBe('Recovered');
    expect(decorator.currentState).toBe('CLOSED');
  });

  it('4. Re-opens circuit if HALF_OPEN trial execution fails', async () => {
    const clock = new TestClock();
    const innerPort: ToolExecutionPort = {
      toolId,
      definition: mockDefinition,
      async execute() {
        return ToolResult.create({
          invocationId: invocation.invocationId,
          toolId,
          status: 'failure',
          output: 'Still failing',
          executionTimeMs: 1,
        });
      },
    };

    const policy = CircuitBreakerPolicy.create({
      failureThreshold: 2,
      resetTimeoutMs: 5000,
    });
    const decorator = new CircuitBreakerToolDecorator({
      inner: innerPort,
      policy,
      clock,
    });

    await decorator.execute(tenant, invocation);
    await decorator.execute(tenant, invocation);
    expect(decorator.currentState).toBe('OPEN');

    clock.advance(6000); // Past reset timeout

    await decorator.execute(tenant, invocation); // HALF_OPEN trial fails
    expect(decorator.currentState).toBe('OPEN');
  });
});

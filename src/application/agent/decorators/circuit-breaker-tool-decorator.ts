import type { ToolExecutionPort } from '../ports/tool-execution-port';
import type { TenantContext } from '../../identity/tenant-context';
import type { ToolInvocation } from '../vo/tool-invocation';
import type { ToolResult } from '../vo/tool-result';
import type { ToolDefinition, ToolId } from '../vo/tool-definition';
import type { CircuitBreakerPolicy } from '../vo/circuit-breaker-policy';
import type { ClockPort } from '../../ports/clock/clock-port';
import { ToolUnavailableError } from '../errors/tool-execution-error';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerToolDecoratorConfig {
  readonly inner: Readonly<ToolExecutionPort>;
  readonly policy: Readonly<CircuitBreakerPolicy>;
  readonly clock: Readonly<ClockPort>;
}

export class CircuitBreakerToolDecorator implements ToolExecutionPort {
  private readonly inner: Readonly<ToolExecutionPort>;
  private readonly policy: Readonly<CircuitBreakerPolicy>;
  private readonly clock: Readonly<ClockPort>;

  private state: CircuitState = 'CLOSED';
  private consecutiveFailures = 0;
  private lastStateChangeTimeMs = 0;
  private halfOpenTrialInFlight = false;

  constructor(config: Readonly<CircuitBreakerToolDecoratorConfig>) {
    if (!config.inner)
      throw new Error(
        '[CircuitBreakerToolDecorator] inner ToolExecutionPort is required.',
      );
    if (!config.policy)
      throw new Error(
        '[CircuitBreakerToolDecorator] CircuitBreakerPolicy is required.',
      );
    if (!config.clock)
      throw new Error('[CircuitBreakerToolDecorator] ClockPort is required.');

    this.inner = config.inner;
    this.policy = config.policy;
    this.clock = config.clock;
    this.lastStateChangeTimeMs = this.clock.now().getTime();
  }

  get toolId(): ToolId {
    return this.inner.toolId;
  }

  get definition(): ToolDefinition {
    return this.inner.definition;
  }

  async execute(
    tenantContext: Readonly<TenantContext>,
    invocation: Readonly<ToolInvocation>,
  ): Promise<ToolResult> {
    const nowMs = this.clock.now().getTime();

    // 1. Evaluate State Transition (OPEN -> HALF_OPEN after resetTimeoutMs)
    if (this.state === 'OPEN') {
      if (nowMs - this.lastStateChangeTimeMs >= this.policy.resetTimeoutMs) {
        this.transitionTo('HALF_OPEN', nowMs);
      } else {
        throw new ToolUnavailableError(
          invocation.toolId,
          invocation.invocationId,
        );
      }
    }

    // 2. Handle HALF_OPEN Race Condition Guard
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenTrialInFlight) {
        throw new ToolUnavailableError(
          invocation.toolId,
          invocation.invocationId,
        );
      }
      this.halfOpenTrialInFlight = true;
    }

    try {
      const result = await this.inner.execute(tenantContext, invocation);

      // Check if ToolResult itself represents an internal tool failure
      if (result.status === 'failure') {
        this.handleFailure(invocation, nowMs);
      } else {
        this.handleSuccess(nowMs);
      }

      return result;
    } catch (err: unknown) {
      this.handleFailure(invocation, nowMs);
      throw err;
    } finally {
      if (this.state === 'HALF_OPEN' || this.halfOpenTrialInFlight) {
        this.halfOpenTrialInFlight = false;
      }
    }
  }

  get currentState(): CircuitState {
    return this.state;
  }

  get failureCount(): number {
    return this.consecutiveFailures;
  }

  private handleSuccess(nowMs: number): void {
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED', nowMs);
    }
    this.consecutiveFailures = 0;
  }

  private handleFailure(
    invocation: Readonly<ToolInvocation>,
    nowMs: number,
  ): void {
    this.consecutiveFailures++;

    if (
      this.state === 'HALF_OPEN' ||
      this.consecutiveFailures >= this.policy.failureThreshold
    ) {
      this.transitionTo('OPEN', nowMs);
    }
  }

  private transitionTo(newState: CircuitState, nowMs: number): void {
    const oldState = this.state;
    this.state = newState;
    this.lastStateChangeTimeMs = nowMs;

    if (newState === 'OPEN') {
      this.onCircuitOpened(oldState);
    } else if (newState === 'CLOSED') {
      this.consecutiveFailures = 0;
      this.onCircuitClosed(oldState);
    } else if (newState === 'HALF_OPEN') {
      this.onCircuitHalfOpened(oldState);
    }
  }

  protected onCircuitOpened(_fromState: CircuitState): void {}
  protected onCircuitClosed(_fromState: CircuitState): void {}
  protected onCircuitHalfOpened(_fromState: CircuitState): void {}
}

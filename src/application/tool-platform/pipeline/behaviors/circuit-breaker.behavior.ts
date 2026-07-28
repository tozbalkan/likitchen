import { ExecutionEnvelope } from '../../vo/execution-envelope';
import { CircuitBreakerService } from '../../services/circuit-breaker-service';
import { ToolExecutionResult } from '../../vo/tool-execution-result';
import type { PipelineBehavior } from './validate-request.behavior';

export class CircuitBreakerBehavior implements PipelineBehavior {
  constructor(private readonly circuitBreaker: CircuitBreakerService) {}

  async execute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    if (!envelope.context.executionPolicy.circuitBreakerEnabled) {
      return envelope;
    }

    const state = this.circuitBreaker.getState(envelope.context.toolId);
    if (state === 'OPEN') {
      const failedCtx = envelope.context.withState('FAILED');
      const circuitResult = new ToolExecutionResult({
        executionId: envelope.context.executionId,
        status: 'FAILED',
        durationMs: 0,
        output: {},
        error: `[CircuitBreakerBehavior] Circuit breaker is OPEN for tool '${envelope.context.toolId}'.`,
      });
      return envelope.withContext(failedCtx).withResult(circuitResult);
    }
    return envelope;
  }
}

import { ExecutionEnvelope } from '../../vo/execution-envelope';
import { ToolExecutionResult } from '../../vo/tool-execution-result';
import type { PipelineBehavior } from './validate-request.behavior';

export class TimeoutAndBudgetBehavior implements PipelineBehavior {
  async execute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    const remaining = envelope.context.remainingMs();
    if (remaining <= 0) {
      const timedOutCtx = envelope.context.withState('TIMED_OUT');
      const timedOutResult = new ToolExecutionResult({
        executionId: envelope.context.executionId,
        status: 'TIMED_OUT',
        durationMs: envelope.context.executionPolicy.timeoutMs,
        output: {},
        error: `[TimeoutAndBudgetBehavior] UTC Deadline expired for execution '${envelope.context.executionId}'.`,
      });
      return envelope.withContext(timedOutCtx).withResult(timedOutResult);
    }
    return envelope;
  }
}

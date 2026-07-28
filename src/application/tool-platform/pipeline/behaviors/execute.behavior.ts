import { ExecutionEnvelope } from '../../vo/execution-envelope';
import { ToolExecutionResult } from '../../vo/tool-execution-result';
import type { ProviderSelectorService } from '../../services/provider-selector-service';
import type { PipelineBehavior } from './validate-request.behavior';

export class ExecuteBehavior implements PipelineBehavior {
  constructor(private readonly providerSelector: ProviderSelectorService) {}

  async execute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    if (envelope.result) return envelope; // Early exit if already handled (e.g. timeout or circuit breaker)

    const driver = this.providerSelector.selectDriver(
      envelope.context.provider,
    );
    const startTime = Date.now();

    try {
      const driverOutput = await driver.execute({
        instanceId: envelope.context.instanceId,
        toolId: envelope.context.toolId,
        payload: envelope.requestPayload,
      });

      const durationMs = Date.now() - startTime;
      const runningCtx = envelope.context.withState('RUNNING');
      const result = new ToolExecutionResult({
        executionId: envelope.context.executionId,
        status: driverOutput.status,
        durationMs,
        output: driverOutput.output,
        providerMetadata: driverOutput.rawMetadata,
        error: driverOutput.error,
      });

      return envelope.withContext(runningCtx).withResult(result);
    } catch (err: unknown) {
      const durationMs = Date.now() - startTime;
      const failedCtx = envelope.context.withState('FAILED');
      const errMessage = err instanceof Error ? err.message : String(err);
      const result = ToolExecutionResult.failure(
        envelope.context.executionId,
        durationMs,
        errMessage,
      );
      return envelope.withContext(failedCtx).withResult(result);
    }
  }
}

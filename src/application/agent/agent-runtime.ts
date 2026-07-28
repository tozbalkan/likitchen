import type { ExecutionPipeline } from './execution-pipeline';
import type { StageContext } from './execution-stage';
import {
  ExecutionResult,
  ExecutionOutcome,
  ExecutionMetrics,
} from './runtime/execution-result';
import type { AgentReplayRecorderPort } from './ports/agent-replay-recorder-port';
import type { CostAccountingPort } from '../intelligence/cost/cost-accounting-port';
import type { TelemetryPort } from '../telemetry/telemetry-port';

export class AgentRuntime {
  constructor(
    private readonly pipeline: ExecutionPipeline,
    private readonly replayStore?: AgentReplayRecorderPort,
    private readonly costAccounting?: CostAccountingPort,
    private readonly telemetryPort?: TelemetryPort,
  ) {}

  async execute(
    initialContext: Readonly<StageContext>,
  ): Promise<ExecutionResult> {
    const startTime = Date.now();
    let finalContext: StageContext = initialContext as StageContext;
    let executionStatus: ExecutionResult['status'] = 'FAILED';

    try {
      finalContext = await this.pipeline.execute(
        initialContext,
        this.telemetryPort,
      );

      if (initialContext.cancellationToken.isCancelled()) {
        executionStatus = 'CANCELLED';
      } else if (finalContext.isOutputValid === false) {
        executionStatus = 'STOPPED';
      } else {
        executionStatus = 'COMPLETED';
      }
    } catch (error: unknown) {
      if (initialContext.cancellationToken.isCancelled()) {
        executionStatus = 'CANCELLED';
      } else {
        executionStatus = 'FAILED';
      }
      throw error;
    } finally {
      // Replay snapshot recording in finally block — guarantees recording even on failure/cancellation
      if (this.replayStore && finalContext.rawProviderResult) {
        try {
          await this.replayStore.recordSnapshot(finalContext.tenantContext, {
            sessionId: finalContext.executionContext.correlationId,
            turnId: 'turn-1',
            promptFingerprint:
              finalContext.plan?.promptReference ?? 'fp-default',
            providerResult: finalContext.rawProviderResult,
            recordedAt: new Date(),
          });
        } catch {
          // Suppress replay errors
        }
      }

      // Track AI cost accounting
      if (this.costAccounting && finalContext.rawProviderResult) {
        try {
          const usage = finalContext.rawProviderResult.metadata.usage;
          if (usage) {
            await this.costAccounting.calculateCost(
              finalContext.rawProviderResult.metadata.providerId,
              finalContext.rawProviderResult.metadata.model,
              {
                promptTokens: usage.promptTokens,
                completionTokens: usage.completionTokens,
              },
              {
                tenantId: finalContext.tenantContext.tenantId,
                sessionId: finalContext.executionContext.correlationId,
              },
            );
          }
        } catch {
          // Suppress cost accounting errors
        }
      }
    }

    const durationMs = Date.now() - startTime;
    const rawResult = finalContext.rawProviderResult;

    const outcome = new ExecutionOutcome({
      responseText: rawResult?.value ?? '',
      providerId: rawResult?.metadata.providerId ?? 'unknown',
      model: rawResult?.metadata.model ?? 'unknown',
      toolCalls: [],
      validationStatus:
        finalContext.isOutputValid === true
          ? 'VALID'
          : finalContext.isOutputValid === false
            ? 'INVALID'
            : 'SKIPPED',
      validationErrors: finalContext.validationErrors,
    });

    const metrics = new ExecutionMetrics({
      totalLatencyMs: durationMs,
      retryCount: 0,
      fallbackCount: 0,
      costUsd: 0.001,
      promptTokens: rawResult?.metadata.usage?.promptTokens ?? 0,
      completionTokens: rawResult?.metadata.usage?.completionTokens ?? 0,
      totalTokens: rawResult?.metadata.usage?.totalTokens ?? 0,
    });

    return new ExecutionResult({
      traceId: finalContext.executionContext.traceId,
      sessionId: finalContext.executionContext.correlationId,
      status: executionStatus,
      outcome,
      metrics,
      completedAt: new Date(),
    });
  }
}

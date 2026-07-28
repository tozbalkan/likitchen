import type {
  ExecutionStage,
  StageContext,
  StageResult,
} from '../execution-stage';
import type { TelemetryPort } from '../../telemetry/telemetry-port';

export class TelemetryStage implements ExecutionStage {
  readonly name = 'TelemetryStage';

  constructor(private readonly telemetryPort?: TelemetryPort) {}

  async execute(context: Readonly<StageContext>): Promise<StageResult> {
    context.cancellationToken.throwIfCancelled();

    if (this.telemetryPort) {
      this.telemetryPort.counter(context.executionContext, {
        name: 'agent.execution.completed',
        attributes: {
          tenantId: context.tenantContext.tenantId,
          providerId: context.providerId ?? 'unknown',
        },
      });
    }

    return {
      status: 'CONTINUE',
      context,
      metadata: { telemetryRecorded: true },
    };
  }
}

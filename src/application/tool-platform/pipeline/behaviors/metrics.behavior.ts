import { ExecutionEnvelope } from '../../vo/execution-envelope';
import type { PipelineBehavior } from './validate-request.behavior';

export class MetricsBehavior implements PipelineBehavior {
  async execute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    if (envelope.result) {
      return envelope.withMetric('durationMs', envelope.result.durationMs);
    }
    return envelope;
  }
}

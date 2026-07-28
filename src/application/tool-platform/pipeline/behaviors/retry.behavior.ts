import { ExecutionEnvelope } from '../../vo/execution-envelope';
import type { PipelineBehavior } from './validate-request.behavior';

export class RetryBehavior implements PipelineBehavior {
  async execute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    // Retry policy configuration attached to context
    return envelope;
  }
}

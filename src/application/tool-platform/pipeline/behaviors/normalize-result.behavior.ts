import { ExecutionEnvelope } from '../../vo/execution-envelope';
import { ToolResultNormalizer } from '../../services/tool-result-normalizer';
import type { PipelineBehavior } from './validate-request.behavior';

export class NormalizeResultBehavior implements PipelineBehavior {
  constructor(private readonly normalizer: ToolResultNormalizer) {}

  async execute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    if (!envelope.result) return envelope;

    const normalizedResult = this.normalizer.normalize(envelope.result);
    const finalState =
      normalizedResult.status === 'SUCCESS'
        ? 'COMPLETED'
        : envelope.context.state;

    return envelope
      .withContext(envelope.context.withState(finalState))
      .withResult(normalizedResult);
  }
}

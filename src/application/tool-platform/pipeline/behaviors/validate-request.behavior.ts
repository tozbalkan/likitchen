import { ExecutionEnvelope } from '../../vo/execution-envelope';

export interface PipelineBehavior {
  execute(envelope: Readonly<ExecutionEnvelope>): Promise<ExecutionEnvelope>;
}

export class ValidateRequestBehavior implements PipelineBehavior {
  async execute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    if (
      !envelope.requestPayload ||
      typeof envelope.requestPayload !== 'object'
    ) {
      throw new Error(
        '[ValidateRequestBehavior] Invalid input request payload.',
      );
    }
    return envelope;
  }
}

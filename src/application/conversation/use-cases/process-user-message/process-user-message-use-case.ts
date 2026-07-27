import { ok, err, type Result } from '../../../../shared/result';
import type { ProcessContext, Uuid } from '../../../../shared/types';
import type { ApplicationError } from '../../../../shared/errors/error';
import type { ProcessUserMessageResponse } from './process-user-message-response';
import type { PipelineContext } from './pipeline-context';
import type { PipelineStep } from './steps';

export interface ProcessUserMessageCommand {
  readonly conversationId: Uuid;
  readonly message: string;
  readonly expectedRevision: number;
}

export class ProcessUserMessageUseCase {
  constructor(private readonly steps: readonly PipelineStep[]) {}

  async execute(
    command: ProcessUserMessageCommand,
    processContext: Readonly<ProcessContext>,
  ): Promise<Result<ProcessUserMessageResponse, ApplicationError>> {
    let context: PipelineContext = {
      processContext,
      message: command.message,
      conversationId: command.conversationId,
      expectedRevision: command.expectedRevision,
    };

    for (const step of this.steps) {
      const result = await step.execute(context);

      if (!result.ok) {
        // Pipeline short-circuits on failure
        return err(result.error);
      }

      context = result.value;
    }

    if (!context.response) {
      return err({
        code: 'ResponseMappingError',
        message:
          'Pipeline completed successfully but no response was generated.',
      });
    }

    return ok(context.response);
  }
}

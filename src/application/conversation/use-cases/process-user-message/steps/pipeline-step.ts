import type { Result } from '../../../../../shared/result';
import type { ApplicationError } from '../../../../../shared/errors/error';
import type { PipelineContext } from '../pipeline-context';

export interface PipelineStep {
  execute(
    context: PipelineContext,
  ): Promise<Result<PipelineContext, ApplicationError>>;
}

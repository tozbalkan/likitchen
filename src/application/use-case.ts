import type { Result } from '../shared/result';
import type { ApplicationError } from '../shared/errors';
import type { ProcessContext } from '../shared/types';

export abstract class UseCase<
  Input,
  Output,
  Error extends ApplicationError = ApplicationError,
> {
  abstract readonly name: string;
  abstract readonly version: number;
  abstract execute(
    input: Input,
    processContext: Readonly<ProcessContext>,
  ): Promise<Result<Output, Error>>;
}

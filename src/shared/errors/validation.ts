import type { ApplicationError } from './error';

export class ValidationFailure implements ApplicationError {
  public readonly code = 'VALIDATION_FAILURE';
  constructor(
    public readonly message: string,
    public readonly details?: Record<string, unknown>,
  ) {}
}

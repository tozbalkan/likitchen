import type { ApplicationError } from './error';

export class ConflictFailure implements ApplicationError {
  public readonly code = 'CONFLICT_FAILURE';
  constructor(
    public readonly message: string,
    public readonly details?: Record<string, unknown>,
  ) {}
}

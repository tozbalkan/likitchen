import type { ApplicationError } from './error';

export class NotFoundError implements ApplicationError {
  public readonly code = 'NOT_FOUND';
  constructor(
    public readonly message: string,
    public readonly details?: Record<string, unknown>,
  ) {}
}

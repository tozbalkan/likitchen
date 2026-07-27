import type { ApplicationError } from '../../../shared/errors/error';

export class PolicyError extends Error implements ApplicationError {
  constructor(
    message: string,
    public readonly code: string = 'PolicyError',
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'PolicyError';
  }
}

import { ZodError } from 'zod';
import { Result, err, ok } from '../result';
import { ValidationFailure } from '../errors/validation';

/**
 * Utility to map a Zod error into a universal Result<T, ValidationFailure>
 */
export function createValidationResult<T>(
  error: ZodError,
): Result<T, ValidationFailure> {
  return err(new ValidationFailure(error.message, error.format() as never));
}

export function createSuccessResult<T>(data: T): Result<T, ValidationFailure> {
  return ok(data);
}

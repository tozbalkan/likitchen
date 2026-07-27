import type { ApplicationError } from './error';

export interface ExtractionFailure extends ApplicationError {
  readonly code: 'ExtractionFailure';
  readonly reason: string;
}

export function createExtractionFailure(
  reason: string,
  message: string,
): ExtractionFailure {
  return {
    code: 'ExtractionFailure',
    message,
    reason,
  };
}

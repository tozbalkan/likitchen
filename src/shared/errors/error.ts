export interface ApplicationError {
  readonly code: string;
  readonly message: string;
  readonly details?: Record<string, unknown> | undefined;
}

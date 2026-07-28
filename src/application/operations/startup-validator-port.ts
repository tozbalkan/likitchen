export interface StartupValidationResult {
  readonly valid: boolean;
  readonly failures: readonly string[];
}

export interface StartupValidatorPort {
  validate(): Promise<StartupValidationResult>;
}

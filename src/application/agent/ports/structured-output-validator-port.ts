export interface ValidationResult {
  readonly valid: boolean;
  readonly parsedData?: unknown | undefined;
  readonly errors?: readonly string[] | undefined;
}

export interface StructuredOutputValidatorPort {
  validate(
    rawOutput: string,
    schema: Readonly<Record<string, unknown>>,
  ): Promise<ValidationResult>;
}

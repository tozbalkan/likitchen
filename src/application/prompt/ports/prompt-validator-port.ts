import type { PromptDocument } from '../prompt-document';

export interface ValidationDiagnostic {
  readonly code: string;
  readonly message: string;
  readonly line?: number | undefined;
}

export interface ValidationResult {
  readonly isValid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
  readonly diagnostics: readonly ValidationDiagnostic[];
}

export interface PromptValidatorPort {
  validate(document: Readonly<PromptDocument>): Promise<ValidationResult>;
}

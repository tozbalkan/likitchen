import type {
  StructuredOutputValidatorPort,
  ValidationResult,
} from '../../application/agent/ports/structured-output-validator-port';

export class JsonSchemaOutputValidatorAdapter implements StructuredOutputValidatorPort {
  async validate(
    rawOutput: string,
    schema: Readonly<Record<string, unknown>>,
  ): Promise<ValidationResult> {
    if (!rawOutput || rawOutput.trim() === '') {
      return {
        valid: false,
        errors: ['Raw output is empty.'],
      };
    }

    try {
      const parsed = JSON.parse(rawOutput) as Record<string, unknown>;

      // Basic required keys check if schema defines required
      if (Array.isArray(schema['required'])) {
        const missing = (schema['required'] as string[]).filter(
          (key) => !(key in parsed),
        );
        if (missing.length > 0) {
          return {
            valid: false,
            parsedData: parsed,
            errors: missing.map((key) => `Missing required property '${key}'.`),
          };
        }
      }

      return {
        valid: true,
        parsedData: parsed,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        errors: [`Invalid JSON output: ${message}`],
      };
    }
  }
}

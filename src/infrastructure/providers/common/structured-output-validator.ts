import type { ZodSchema } from 'zod';
import { InvalidStructuredOutputException } from './provider-exception';

export class StructuredOutputValidator {
  validate<T>(jsonString: string, schema: ZodSchema<T>, providerId: string): T {
    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(jsonString);
    } catch {
      throw new InvalidStructuredOutputException(
        `Invalid JSON response: ${jsonString}`,
        providerId,
      );
    }

    const result = schema.safeParse(parsedJson);
    if (!result.success) {
      throw new InvalidStructuredOutputException(
        `JSON failed schema validation: ${result.error.message}`,
        providerId,
      );
    }

    return result.data;
  }
}

import type {
  PromptValidatorPort,
  ValidationResult,
} from './ports/prompt-validator-port';
import type { PromptDocument } from './prompt-document';

export class PromptValidatorService implements PromptValidatorPort {
  private readonly maxTemplateLength = 50000;

  async validate(
    document: Readonly<PromptDocument>,
  ): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const diagnostics: Array<{ code: string; message: string }> = [];

    // 1. Max template length
    const totalLen =
      document.systemTemplate.length + document.userTemplate.length;
    if (totalLen > this.maxTemplateLength) {
      errors.push(
        `Template total length (${totalLen}) exceeds maximum allowed (${this.maxTemplateLength}).`,
      );
      diagnostics.push({
        code: 'MAX_LENGTH_EXCEEDED',
        message: 'Template total length exceeded limit',
      });
    }

    // 2. Placeholder extract {{variable}}
    const placeholderRegex = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
    const systemPlaceholders = new Set<string>();
    const userPlaceholders = new Set<string>();

    let match: RegExpExecArray | null;
    while ((match = placeholderRegex.exec(document.systemTemplate)) !== null) {
      systemPlaceholders.add(match[1]!);
    }
    while ((match = placeholderRegex.exec(document.userTemplate)) !== null) {
      userPlaceholders.add(match[1]!);
    }

    const allPlaceholders = new Set([
      ...systemPlaceholders,
      ...userPlaceholders,
    ]);

    // 3. Unused variables in declared variables list
    for (const declaredVar of document.variables) {
      if (!allPlaceholders.has(declaredVar)) {
        warnings.push(
          `Declared variable '${declaredVar}' is not used in system or user template.`,
        );
        diagnostics.push({
          code: 'UNUSED_VARIABLE',
          message: `Variable ${declaredVar} declared but unused`,
        });
      }
    }

    // 4. Undeclared placeholders
    const declaredSet = new Set(document.variables);
    for (const placeholder of allPlaceholders) {
      if (!declaredSet.has(placeholder)) {
        errors.push(
          `Placeholder '{{${placeholder}}}' found in template but not listed in declared variables.`,
        );
        diagnostics.push({
          code: 'UNDECLARED_PLACEHOLDER',
          message: `Placeholder {{${placeholder}}} not declared`,
        });
      }
    }

    // 5. Unclosed mustache brackets check
    const openBrackets =
      (document.systemTemplate + document.userTemplate).split('{{').length - 1;
    const closeBrackets =
      (document.systemTemplate + document.userTemplate).split('}}').length - 1;
    if (openBrackets !== closeBrackets) {
      errors.push(
        `Template syntax error: mismatched mustache brackets (open: ${openBrackets}, close: ${closeBrackets}).`,
      );
      diagnostics.push({
        code: 'MISMATCHED_BRACKETS',
        message: 'Mismatched mustache brackets',
      });
    }

    return {
      isValid: errors.length === 0,
      errors: Object.freeze(errors),
      warnings: Object.freeze(warnings),
      diagnostics: Object.freeze(diagnostics),
    };
  }
}

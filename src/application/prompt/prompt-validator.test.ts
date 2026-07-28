import { describe, it, expect } from 'vitest';
import { PromptDocument } from './prompt-document';
import { PromptValidatorService } from './prompt-validator';

describe('PromptValidatorService', () => {
  const validator = new PromptValidatorService();

  it('validates a valid document with correct placeholders', async () => {
    const doc = PromptDocument.create({
      id: 'doc-valid',
      systemTemplate: 'System {{role}}',
      userTemplate: 'User {{query}}',
      variables: ['role', 'query'],
    });

    const result = await validator.validate(doc);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('reports errors for undeclared placeholders and warnings for unused variables', async () => {
    const doc = PromptDocument.create({
      id: 'doc-invalid',
      systemTemplate: 'System {{role}} and {{undeclared}}',
      userTemplate: 'User text',
      variables: ['role', 'unused_var'],
    });

    const result = await validator.validate(doc);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain(
      "Placeholder '{{undeclared}}' found in template but not listed in declared variables.",
    );
    expect(result.warnings).toContain(
      "Declared variable 'unused_var' is not used in system or user template.",
    );
  });
});

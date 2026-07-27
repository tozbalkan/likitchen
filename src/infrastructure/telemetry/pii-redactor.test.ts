import { describe, it, expect } from 'vitest';
import { PiiRedactor } from './pii-redactor';

describe('PiiRedactor', () => {
  const redactor = new PiiRedactor();

  it('redacts email addresses correctly', () => {
    const redacted = redactor.redactString(
      'Contact me at john.doe@example.com for info.',
      'EMAIL',
    );
    expect(redacted).toContain('j***@example.com');
    expect(redacted).not.toContain('john.doe@example.com');
  });

  it('redacts phone numbers correctly', () => {
    const redacted = redactor.redactString('Call 555-123-4567 today.', 'PHONE');
    expect(redacted).toContain('***-***-****');
    expect(redacted).not.toContain('555-123-4567');
  });

  it('redacts secrets and JWT tokens', () => {
    const redacted = redactor.redactString('secret-token-123', 'SECRET');
    expect(redacted).toBe('[REDACTED_SECRET]');
  });

  it('redacts sensitive dictionary attributes based on key names', () => {
    const attrs = {
      customerEmail: 'alice@test.com',
      customerPhone: '555-999-0000',
      apiKey: 'secret-key-xyz',
      nonPii: 'public data',
    };

    const redactedAttrs = redactor.redactAttributes(attrs);

    expect(redactedAttrs.customerEmail).toContain('a***@test.com');
    expect(redactedAttrs.customerPhone).toBe('***-***-****');
    expect(redactedAttrs.apiKey).toBe('[REDACTED_SECRET]');
    expect(redactedAttrs.nonPii).toBe('public data');
  });
});

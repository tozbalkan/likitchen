import { describe, it, expect } from 'vitest';
import { Secret } from './secret';

describe('Secret Value Object', () => {
  it('throws error when secret value is empty', () => {
    expect(() => new Secret('')).toThrow('Secret value cannot be empty.');
  });

  it('provides raw value via value() method', () => {
    const secret = new Secret('sk-my-api-key-123456');
    expect(secret.value()).toBe('sk-my-api-key-123456');
  });

  it('redacts value safely via redact() method', () => {
    const secret = new Secret('sk-my-api-key-123456');
    expect(secret.redact()).toBe('sk-m...3456');
  });

  it('prevents raw credential leakage in toString() and toJSON()', () => {
    const secret = new Secret('super-secret-password');
    expect(secret.toString()).toBe('[REDACTED_SECRET]');
    expect(JSON.stringify(secret)).toBe('"[REDACTED_SECRET]"');
  });

  it('compares equality safely with equals()', () => {
    const secret1 = new Secret('same-secret');
    const secret2 = new Secret('same-secret');
    const secret3 = new Secret('different-secret');

    expect(secret1.equals(secret2)).toBe(true);
    expect(secret1.equals(secret3)).toBe(false);
    expect(secret1.equals(null)).toBe(false);
  });
});

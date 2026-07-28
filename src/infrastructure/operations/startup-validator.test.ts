import { describe, it, expect } from 'vitest';
import { StartupValidatorAdapter } from './startup-validator';

describe('StartupValidatorAdapter', () => {
  it('returns valid when all checks pass', async () => {
    const validator = new StartupValidatorAdapter([
      { name: 'config-loaded', check: async () => true },
      { name: 'secrets-loaded', check: async () => true },
    ]);

    const result = await validator.validate();

    expect(result.valid).toBe(true);
    expect(result.failures).toHaveLength(0);
  });

  it('returns invalid with failure messages when checks fail', async () => {
    const validator = new StartupValidatorAdapter([
      { name: 'config-loaded', check: async () => true },
      { name: 'vault-reachable', check: async () => false },
      { name: 'database-ready', check: async () => false },
    ]);

    const result = await validator.validate();

    expect(result.valid).toBe(false);
    expect(result.failures).toHaveLength(2);
    expect(result.failures[0]).toContain('vault-reachable');
    expect(result.failures[1]).toContain('database-ready');
  });

  it('catches thrown errors as failures', async () => {
    const validator = new StartupValidatorAdapter([
      {
        name: 'crash-check',
        check: async () => {
          throw new Error('Connection refused');
        },
      },
    ]);

    const result = await validator.validate();

    expect(result.valid).toBe(false);
    expect(result.failures[0]).toContain('crash-check');
    expect(result.failures[0]).toContain('Connection refused');
  });

  it('returns valid for empty checks list', async () => {
    const validator = new StartupValidatorAdapter([]);

    const result = await validator.validate();

    expect(result.valid).toBe(true);
    expect(result.failures).toHaveLength(0);
  });
});

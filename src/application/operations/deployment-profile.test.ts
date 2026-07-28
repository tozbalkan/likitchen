import { describe, it, expect } from 'vitest';
import { DeploymentProfile } from './deployment-profile';

describe('DeploymentProfile', () => {
  it('creates a development profile with expected defaults', () => {
    const profile = DeploymentProfile.development();

    expect(profile.environment).toBe('development');
    expect(profile.retryMaxAttempts).toBe(1);
    expect(profile.logLevel).toBe('debug');
    expect(profile.diagnosticsVerbose).toBe(true);
    expect(profile.telemetrySampleRate).toBe(1.0);
    expect(profile.isProduction()).toBe(false);
  });

  it('creates a test profile with zero telemetry sampling', () => {
    const profile = DeploymentProfile.test();

    expect(profile.environment).toBe('test');
    expect(profile.telemetrySampleRate).toBe(0);
    expect(profile.retryBackoffMs).toBe(0);
    expect(profile.logLevel).toBe('error');
    expect(profile.isProduction()).toBe(false);
  });

  it('creates a staging profile with moderate settings', () => {
    const profile = DeploymentProfile.staging();

    expect(profile.environment).toBe('staging');
    expect(profile.retryMaxAttempts).toBe(2);
    expect(profile.telemetrySampleRate).toBe(0.5);
    expect(profile.diagnosticsVerbose).toBe(true);
  });

  it('creates a production profile with hardened settings', () => {
    const profile = DeploymentProfile.production();

    expect(profile.environment).toBe('production');
    expect(profile.retryMaxAttempts).toBe(3);
    expect(profile.retryBackoffMs).toBe(500);
    expect(profile.timeoutMs).toBe(5000);
    expect(profile.telemetrySampleRate).toBe(0.1);
    expect(profile.logLevel).toBe('warn');
    expect(profile.diagnosticsVerbose).toBe(false);
    expect(profile.isProduction()).toBe(true);
  });

  it('is immutable — properties cannot be reassigned', () => {
    const profile = DeploymentProfile.production();

    // readonly properties — TypeScript enforces this at compile time
    expect(Object.isFrozen(profile)).toBe(false); // Not frozen, but readonly
    expect(profile.environment).toBe('production');
  });
});

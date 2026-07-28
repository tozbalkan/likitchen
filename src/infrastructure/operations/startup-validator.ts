import type {
  StartupValidatorPort,
  StartupValidationResult,
} from '../../application/operations/startup-validator-port';

export interface StartupCheck {
  readonly name: string;
  check(): Promise<boolean>;
}

export class StartupValidatorAdapter implements StartupValidatorPort {
  private readonly checks: readonly StartupCheck[];

  constructor(checks: readonly StartupCheck[]) {
    this.checks = checks;
  }

  async validate(): Promise<StartupValidationResult> {
    const failures: string[] = [];

    for (const check of this.checks) {
      try {
        const passed = await check.check();
        if (!passed) {
          failures.push(`[StartupValidator] Check failed: ${check.name}`);
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(
          `[StartupValidator] Check threw: ${check.name} — ${message}`,
        );
      }
    }

    return {
      valid: failures.length === 0,
      failures,
    };
  }
}

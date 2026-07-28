export type DeploymentEnvironment =
  'development' | 'test' | 'ci' | 'staging' | 'production';

export interface DeploymentProfileProps {
  readonly environment: DeploymentEnvironment;
  readonly retryMaxAttempts: number;
  readonly retryBackoffMs: number;
  readonly timeoutMs: number;
  readonly telemetrySampleRate: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly diagnosticsVerbose: boolean;
}

export class DeploymentProfile {
  readonly environment: DeploymentEnvironment;
  readonly retryMaxAttempts: number;
  readonly retryBackoffMs: number;
  readonly timeoutMs: number;
  readonly telemetrySampleRate: number;
  readonly logLevel: 'debug' | 'info' | 'warn' | 'error';
  readonly diagnosticsVerbose: boolean;

  private constructor(props: Readonly<DeploymentProfileProps>) {
    this.environment = props.environment;
    this.retryMaxAttempts = props.retryMaxAttempts;
    this.retryBackoffMs = props.retryBackoffMs;
    this.timeoutMs = props.timeoutMs;
    this.telemetrySampleRate = props.telemetrySampleRate;
    this.logLevel = props.logLevel;
    this.diagnosticsVerbose = props.diagnosticsVerbose;
  }

  static development(): DeploymentProfile {
    return new DeploymentProfile({
      environment: 'development',
      retryMaxAttempts: 1,
      retryBackoffMs: 50,
      timeoutMs: 30000,
      telemetrySampleRate: 1.0,
      logLevel: 'debug',
      diagnosticsVerbose: true,
    });
  }

  static test(): DeploymentProfile {
    return new DeploymentProfile({
      environment: 'test',
      retryMaxAttempts: 1,
      retryBackoffMs: 0,
      timeoutMs: 5000,
      telemetrySampleRate: 0,
      logLevel: 'error',
      diagnosticsVerbose: false,
    });
  }

  static staging(): DeploymentProfile {
    return new DeploymentProfile({
      environment: 'staging',
      retryMaxAttempts: 2,
      retryBackoffMs: 200,
      timeoutMs: 10000,
      telemetrySampleRate: 0.5,
      logLevel: 'info',
      diagnosticsVerbose: true,
    });
  }

  static production(): DeploymentProfile {
    return new DeploymentProfile({
      environment: 'production',
      retryMaxAttempts: 3,
      retryBackoffMs: 500,
      timeoutMs: 5000,
      telemetrySampleRate: 0.1,
      logLevel: 'warn',
      diagnosticsVerbose: false,
    });
  }

  isProduction(): boolean {
    return this.environment === 'production';
  }
}

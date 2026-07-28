import type { ApplicationRegistry } from './application-registry';
import { DeploymentProfile } from '../application/operations/deployment-profile';
import { ApplicationHost } from '../infrastructure/hosting/application-host';
import { GracefulShutdown } from '../infrastructure/hosting/graceful-shutdown';
import { HttpRuntime } from '../infrastructure/hosting/http-runtime';
import {
  StartupValidatorAdapter,
  type StartupCheck,
} from '../infrastructure/operations/startup-validator';
import { DiagnosticsServiceAdapter } from '../infrastructure/operations/diagnostics-service';
import type { InfrastructureComponent } from '../application/operations/infrastructure-component';

export interface HostingOptions {
  readonly profile?: DeploymentProfile;
  readonly version?: string;
  readonly buildTimestamp?: string;
  readonly gitCommit?: string;
  readonly shutdownTimeoutMs?: number;
  readonly startupChecks?: readonly StartupCheck[];
  readonly components?: readonly InfrastructureComponent[];
}

export function registerHosting(
  registry: ApplicationRegistry,
  options: Readonly<HostingOptions> = {},
): void {
  const profile = options.profile ?? DeploymentProfile.development();
  const components = options.components ?? [];

  // 1. ApplicationHost manages infrastructure lifecycle
  const host = new ApplicationHost(components);

  // 2. Startup Validator
  const startupChecks = options.startupChecks ?? [];
  const startupValidator = new StartupValidatorAdapter(startupChecks);

  // 3. Diagnostics
  const diagnostics = new DiagnosticsServiceAdapter({
    host,
    profile,
    version: options.version ?? '0.0.0-dev',
    buildTimestamp: options.buildTimestamp ?? new Date().toISOString(),
    gitCommit: options.gitCommit,
  });

  // 4. HttpRuntime (operational endpoints)
  const httpRuntime = new HttpRuntime({ host, diagnostics });

  // 5. Graceful Shutdown
  const gracefulShutdown = new GracefulShutdown(
    host,
    options.shutdownTimeoutMs ?? 10000,
  );

  registry.register('DeploymentProfile', profile);
  registry.register('ApplicationHost', host);
  registry.register('StartupValidatorPort', startupValidator);
  registry.register('DiagnosticsPort', diagnostics);
  registry.register('HttpRuntime', httpRuntime);
  registry.register('GracefulShutdown', gracefulShutdown);
}

import type {
  DiagnosticsPort,
  DiagnosticsInfo,
} from '../../application/operations/diagnostics-port';
import type { ApplicationHost } from '../hosting/application-host';
import type { DeploymentProfile } from '../../application/operations/deployment-profile';

export interface DiagnosticsServiceDeps {
  readonly host: ApplicationHost;
  readonly profile: DeploymentProfile;
  readonly version: string;
  readonly buildTimestamp: string;
  readonly gitCommit?: string | undefined;
}

export class DiagnosticsServiceAdapter implements DiagnosticsPort {
  constructor(private readonly deps: Readonly<DiagnosticsServiceDeps>) {}

  async getDiagnostics(): Promise<DiagnosticsInfo> {
    return {
      version: this.deps.version,
      buildTimestamp: this.deps.buildTimestamp,
      deploymentProfile: this.deps.profile.environment,
      uptimeMs: this.deps.host.getUptimeMs(),
      componentSummary: [...this.deps.host.getComponentNames()],
      gitCommit: this.deps.gitCommit,
    };
  }
}

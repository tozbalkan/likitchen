import type { ApplicationHost } from './application-host';
import type { ComponentHealthStatus } from '../../application/resilience/health-check-port';
import type { DiagnosticsPort } from '../../application/operations/diagnostics-port';

export interface HttpRuntimeDeps {
  readonly host: ApplicationHost;
  readonly diagnostics: DiagnosticsPort;
}

export interface HttpResponse {
  readonly status: number;
  readonly body: Record<string, unknown>;
}

export class HttpRuntime {
  constructor(private readonly deps: Readonly<HttpRuntimeDeps>) {}

  async handleHealth(): Promise<HttpResponse> {
    const statuses = await this.deps.host.checkHealth();
    const healthy = statuses.every((s) => s.status !== 'UNHEALTHY');
    return {
      status: healthy ? 200 : 503,
      body: {
        status: healthy ? 'healthy' : 'unhealthy',
        components: statuses.map((s: ComponentHealthStatus) => ({
          name: s.name,
          status: s.status,
          latencyMs: s.latencyMs,
        })),
      },
    };
  }

  handleReady(): HttpResponse {
    const ready = this.deps.host.isReady();
    return {
      status: ready ? 200 : 503,
      body: { ready },
    };
  }

  handleLive(): HttpResponse {
    const live = this.deps.host.isLive();
    return {
      status: live ? 200 : 503,
      body: { live },
    };
  }

  async handleDiagnostics(): Promise<HttpResponse> {
    const info = await this.deps.diagnostics.getDiagnostics();
    return {
      status: 200,
      body: { ...info },
    };
  }

  async handleVersion(): Promise<HttpResponse> {
    const info = await this.deps.diagnostics.getDiagnostics();
    return {
      status: 200,
      body: {
        version: info.version,
        gitCommit: info.gitCommit,
        buildTimestamp: info.buildTimestamp,
      },
    };
  }
}

import type { ComponentHealthStatus } from '../resilience/health-check-port';

export interface InfrastructureComponent {
  readonly name: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  dispose(): Promise<void>;
  health(): Promise<ComponentHealthStatus>;
}

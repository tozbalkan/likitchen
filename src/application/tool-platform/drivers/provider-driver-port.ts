import { ProviderCapabilities } from '../vo/provider-capabilities';
import { ToolExecutionStatus } from '../vo/tool-execution-result';

export interface DriverExecutionInput {
  readonly instanceId: string;
  readonly toolId: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly credentials?: Readonly<Record<string, string>> | undefined;
  readonly endpointUrl?: string | undefined;
}

export interface DriverExecutionOutput {
  readonly status: ToolExecutionStatus;
  readonly output: Readonly<Record<string, unknown>>;
  readonly rawMetadata?: Readonly<Record<string, unknown>> | undefined;
  readonly error?: string | undefined;
}

export interface ProviderDriverPort {
  readonly providerName: string;
  getCapabilities(): Promise<ProviderCapabilities>;
  execute(
    input: Readonly<DriverExecutionInput>,
  ): Promise<DriverExecutionOutput>;
  cancel?(executionId: string): Promise<void>;
  health?(): Promise<{ isHealthy: boolean; message?: string | undefined }>;
}

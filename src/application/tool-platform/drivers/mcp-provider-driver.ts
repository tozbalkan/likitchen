import type {
  ProviderDriverPort,
  DriverExecutionInput,
  DriverExecutionOutput,
} from './provider-driver-port';
import { ProviderCapabilities } from '../vo/provider-capabilities';
import { ProviderCapabilitySnapshot } from '../vo/provider-capability-snapshot';

export class MCPProviderDriver implements ProviderDriverPort {
  readonly providerName = 'mcp-provider';
  private snapshot?: ProviderCapabilitySnapshot | undefined;

  async getCapabilities(): Promise<ProviderCapabilities> {
    if (this.snapshot && !this.snapshot.isExpired()) {
      return this.snapshot.capabilities;
    }

    const caps = new ProviderCapabilities({
      providerName: this.providerName,
      supportsStreaming: true,
      supportsCancellation: true,
      supportsStructuredOutput: true,
      supportsParallelExecution: true,
      supportsFiles: true,
    });

    this.snapshot = ProviderCapabilitySnapshot.create(caps, 60000);
    return caps;
  }

  async execute(
    input: Readonly<DriverExecutionInput>,
  ): Promise<DriverExecutionOutput> {
    return {
      status: 'SUCCESS',
      output: {
        result: `MCP tool execution output for instance '${input.instanceId}'`,
        payload: input.payload,
      },
      rawMetadata: { provider: this.providerName, protocol: 'mcp-v1' },
    };
  }

  async cancel(_executionId: string): Promise<void> {
    // Cancel MCP session task
  }

  async health(): Promise<{
    isHealthy: boolean;
    message?: string | undefined;
  }> {
    return { isHealthy: true, message: 'MCP Provider operational' };
  }
}

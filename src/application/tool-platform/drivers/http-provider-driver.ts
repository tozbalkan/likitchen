import type {
  ProviderDriverPort,
  DriverExecutionInput,
  DriverExecutionOutput,
} from './provider-driver-port';
import { ProviderCapabilities } from '../vo/provider-capabilities';

export class HTTPProviderDriver implements ProviderDriverPort {
  readonly providerName = 'http-provider';

  async getCapabilities(): Promise<ProviderCapabilities> {
    return new ProviderCapabilities({
      providerName: this.providerName,
      supportsStreaming: false,
      supportsCancellation: true,
      supportsStructuredOutput: true,
      supportsParallelExecution: true,
    });
  }

  async execute(
    input: Readonly<DriverExecutionInput>,
  ): Promise<DriverExecutionOutput> {
    return {
      status: 'SUCCESS',
      output: {
        httpResponse: `HTTP 200 OK for '${input.endpointUrl ?? 'https://api.example.com'}'`,
        echoPayload: input.payload,
      },
      rawMetadata: { provider: this.providerName },
    };
  }

  async health(): Promise<{
    isHealthy: boolean;
    message?: string | undefined;
  }> {
    return { isHealthy: true, message: 'HTTP Provider operational' };
  }
}

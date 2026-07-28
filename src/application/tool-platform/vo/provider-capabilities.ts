export interface ProviderCapabilitiesProps {
  readonly providerName: string;
  readonly supportsStreaming: boolean;
  readonly supportsCancellation: boolean;
  readonly supportsStructuredOutput: boolean;
  readonly supportsParallelExecution: boolean;
  readonly supportsImages?: boolean | undefined;
  readonly supportsAudio?: boolean | undefined;
  readonly supportsFiles?: boolean | undefined;
  readonly supportsReasoning?: boolean | undefined;
}

export class ProviderCapabilities {
  readonly providerName: string;
  readonly supportsStreaming: boolean;
  readonly supportsCancellation: boolean;
  readonly supportsStructuredOutput: boolean;
  readonly supportsParallelExecution: boolean;
  readonly supportsImages: boolean;
  readonly supportsAudio: boolean;
  readonly supportsFiles: boolean;
  readonly supportsReasoning: boolean;

  constructor(props: ProviderCapabilitiesProps) {
    this.providerName = props.providerName;
    this.supportsStreaming = props.supportsStreaming;
    this.supportsCancellation = props.supportsCancellation;
    this.supportsStructuredOutput = props.supportsStructuredOutput;
    this.supportsParallelExecution = props.supportsParallelExecution;
    this.supportsImages = props.supportsImages ?? false;
    this.supportsAudio = props.supportsAudio ?? false;
    this.supportsFiles = props.supportsFiles ?? false;
    this.supportsReasoning = props.supportsReasoning ?? false;

    Object.freeze(this);
  }

  static defaultCapabilities(providerName: string): ProviderCapabilities {
    return new ProviderCapabilities({
      providerName,
      supportsStreaming: true,
      supportsCancellation: true,
      supportsStructuredOutput: true,
      supportsParallelExecution: true,
    });
  }
}

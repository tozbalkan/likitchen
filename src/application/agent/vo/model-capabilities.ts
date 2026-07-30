export interface ModelCapabilitiesProps {
  readonly supportsTools: boolean;
  readonly supportsStreaming: boolean;
  readonly supportsVision: boolean;
  readonly supportsReasoning: boolean;
  readonly supportsJsonMode: boolean;
}

export class ModelCapabilities {
  readonly supportsTools: boolean;
  readonly supportsStreaming: boolean;
  readonly supportsVision: boolean;
  readonly supportsReasoning: boolean;
  readonly supportsJsonMode: boolean;

  private constructor(props: Readonly<ModelCapabilitiesProps>) {
    this.supportsTools = Boolean(props.supportsTools);
    this.supportsStreaming = Boolean(props.supportsStreaming);
    this.supportsVision = Boolean(props.supportsVision);
    this.supportsReasoning = Boolean(props.supportsReasoning);
    this.supportsJsonMode = Boolean(props.supportsJsonMode);
    Object.freeze(this);
  }

  static create(props: Readonly<ModelCapabilitiesProps>): ModelCapabilities {
    return new ModelCapabilities(props);
  }

  static defaultTextOnly(): ModelCapabilities {
    return new ModelCapabilities({
      supportsTools: false,
      supportsStreaming: false,
      supportsVision: false,
      supportsReasoning: false,
      supportsJsonMode: false,
    });
  }
}

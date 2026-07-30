export interface GenerationConfigProps {
  readonly temperature?: number | undefined;
  readonly topP?: number | undefined;
  readonly seed?: number | undefined;
  readonly maxTokens?: number | undefined;
  readonly candidateCount?: number | undefined;
  readonly stopSequences?: ReadonlyArray<string> | undefined;
}

export class GenerationConfig {
  readonly temperature?: number | undefined;
  readonly topP?: number | undefined;
  readonly seed?: number | undefined;
  readonly maxTokens?: number | undefined;
  readonly candidateCount: number;
  readonly stopSequences: ReadonlyArray<string>;

  private constructor(props: Readonly<GenerationConfigProps>) {
    if (
      props.temperature !== undefined &&
      (props.temperature < 0 || props.temperature > 2)
    ) {
      throw new Error(
        '[GenerationConfig] temperature must be between 0.0 and 2.0.',
      );
    }
    if (props.topP !== undefined && (props.topP < 0 || props.topP > 1)) {
      throw new Error('[GenerationConfig] topP must be between 0.0 and 1.0.');
    }
    if (props.maxTokens !== undefined && props.maxTokens <= 0) {
      throw new Error(
        '[GenerationConfig] maxTokens must be a positive integer.',
      );
    }

    this.temperature = props.temperature;
    this.topP = props.topP;
    this.seed = props.seed;
    this.maxTokens = props.maxTokens;
    this.candidateCount = props.candidateCount ?? 1;
    this.stopSequences = Object.freeze([...(props.stopSequences ?? [])]);
    Object.freeze(this);
  }

  static create(props?: Readonly<GenerationConfigProps>): GenerationConfig {
    return new GenerationConfig(props ?? {});
  }

  static default(): GenerationConfig {
    return new GenerationConfig({});
  }
}

import type { ModelDescriptor } from './model-descriptor';
import type { LLMMessage } from './llm-message';
import { GenerationConfig } from './generation-config';

export interface LLMRequestProps {
  readonly model: ModelDescriptor;
  readonly systemMessages?: ReadonlyArray<LLMMessage> | undefined;
  readonly messages: ReadonlyArray<LLMMessage>;
  readonly config?: GenerationConfig | undefined;
}

export class LLMRequest {
  readonly model: ModelDescriptor;
  readonly systemMessages: ReadonlyArray<LLMMessage>;
  readonly messages: ReadonlyArray<LLMMessage>;
  readonly config: GenerationConfig;

  private constructor(props: Readonly<LLMRequestProps>) {
    if (!props.model) {
      throw new Error('[LLMRequest] model is required.');
    }
    if (!props.messages || props.messages.length === 0) {
      throw new Error('[LLMRequest] messages array cannot be empty.');
    }

    this.model = props.model;
    this.systemMessages = Object.freeze([...(props.systemMessages ?? [])]);
    this.messages = Object.freeze([...props.messages]);
    this.config = props.config ?? GenerationConfig.default();
    Object.freeze(this);
  }

  static create(props: Readonly<LLMRequestProps>): LLMRequest {
    return new LLMRequest(props);
  }
}

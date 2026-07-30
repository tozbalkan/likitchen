import type { LLMMessage } from './llm-message';

export type FinishReason =
  | 'stop'
  | 'length'
  | 'tool_call'
  | 'content_filter'
  | 'cancelled'
  | 'timeout'
  | 'error'
  | 'unknown';

export interface LLMChoiceProps {
  readonly index: number;
  readonly message: LLMMessage;
  readonly finishReason: FinishReason;
}

export class LLMChoice {
  readonly index: number;
  readonly message: LLMMessage;
  readonly finishReason: FinishReason;

  private constructor(props: Readonly<LLMChoiceProps>) {
    if (props.index < 0) {
      throw new Error('[LLMChoice] index cannot be negative.');
    }
    if (!props.message) {
      throw new Error('[LLMChoice] message is required.');
    }

    this.index = props.index;
    this.message = props.message;
    this.finishReason = props.finishReason ?? 'unknown';
    Object.freeze(this);
  }

  static create(props: Readonly<LLMChoiceProps>): LLMChoice {
    return new LLMChoice(props);
  }
}

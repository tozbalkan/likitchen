import type { Brand } from '../../../shared/types';
import type { LLMResponse } from './llm-response';
import type { ReasoningStep } from './reasoning-step';

export type ReasoningSessionId = Brand<string, 'ReasoningSessionId'>;

export type ReasoningFinishReason =
  'COMPLETED' | 'MAX_STEPS' | 'TIMEOUT' | 'UNHANDLED_ERROR' | 'CANCELLED';

export interface ReActCycleResultProps {
  readonly sessionId: ReasoningSessionId;
  readonly finishReason: ReasoningFinishReason;
  readonly finalResponse?: LLMResponse | undefined;
  readonly steps: ReadonlyArray<ReasoningStep>;
  readonly totalDurationMs: number;
}

export class ReActCycleResult {
  readonly sessionId: ReasoningSessionId;
  readonly finishReason: ReasoningFinishReason;
  readonly finalResponse?: LLMResponse | undefined;
  readonly steps: ReadonlyArray<ReasoningStep>;
  readonly totalDurationMs: number;

  private constructor(props: Readonly<ReActCycleResultProps>) {
    if (!props.sessionId || props.sessionId.trim() === '') {
      throw new Error('[ReActCycleResult] sessionId cannot be empty.');
    }
    if (!props.finishReason) {
      throw new Error('[ReActCycleResult] finishReason is required.');
    }
    if (props.totalDurationMs < 0) {
      throw new Error('[ReActCycleResult] totalDurationMs cannot be negative.');
    }

    this.sessionId = props.sessionId;
    this.finishReason = props.finishReason;
    if (props.finalResponse !== undefined) {
      this.finalResponse = props.finalResponse;
    }
    this.steps = Object.freeze([...(props.steps ?? [])]);
    this.totalDurationMs = props.totalDurationMs;
    Object.freeze(this);
  }

  static create(props: Readonly<ReActCycleResultProps>): ReActCycleResult {
    return new ReActCycleResult(props);
  }

  get isCompleted(): boolean {
    return this.finishReason === 'COMPLETED';
  }
}

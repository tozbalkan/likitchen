import type { Instant } from '../../../shared/types';
import type { ReasoningAction } from './reasoning-action';
import type { Observation } from './observation';

export type ReasoningStateType =
  | 'PROMPTING_LLM'
  | 'EVALUATING_OUTPUT'
  | 'EXECUTING_TOOL'
  | 'OBSERVING_RESULT'
  | 'FINISHED';

export interface ReasoningStepProps {
  readonly stepIndex: number;
  readonly state: ReasoningStateType;
  readonly action: ReasoningAction;
  readonly observation?: Observation | undefined;
  readonly timestamp?: Instant | undefined;
}

export class ReasoningStep {
  readonly stepIndex: number;
  readonly state: ReasoningStateType;
  readonly action: ReasoningAction;
  readonly observation?: Observation | undefined;
  readonly timestamp: Instant;

  private constructor(props: Readonly<ReasoningStepProps>) {
    if (props.stepIndex < 0) {
      throw new Error('[ReasoningStep] stepIndex cannot be negative.');
    }
    if (!props.state) {
      throw new Error('[ReasoningStep] state is required.');
    }
    if (!props.action) {
      throw new Error('[ReasoningStep] action is required.');
    }

    this.stepIndex = props.stepIndex;
    this.state = props.state;
    this.action = props.action;
    if (props.observation !== undefined) {
      this.observation = props.observation;
    }
    this.timestamp = props.timestamp ?? new Date();
    Object.freeze(this);
  }

  static create(props: Readonly<ReasoningStepProps>): ReasoningStep {
    return new ReasoningStep(props);
  }
}

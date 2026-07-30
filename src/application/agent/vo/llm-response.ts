import type { ModelDescriptor } from './model-descriptor';
import type { LLMChoice } from './llm-choice';
import type { UsageBreakdown } from './usage-breakdown';
import type { Instant } from '../../../shared/types';
import { ResponseValidationError } from '../errors/agent-runtime-error';

export interface LLMResponseProps {
  readonly id: string;
  readonly model: ModelDescriptor;
  readonly choices: ReadonlyArray<LLMChoice>;
  readonly usage: UsageBreakdown;
  readonly providerRequestId?: string | undefined;
  readonly createdAt: Instant;
}

export class LLMResponse {
  readonly id: string;
  readonly model: ModelDescriptor;
  readonly choices: ReadonlyArray<LLMChoice>;
  readonly usage: UsageBreakdown;
  readonly providerRequestId?: string | undefined;
  readonly createdAt: Instant;

  private constructor(props: Readonly<LLMResponseProps>) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('[LLMResponse] id cannot be empty.');
    }
    if (!props.model) {
      throw new Error('[LLMResponse] model is required.');
    }
    if (!props.choices || props.choices.length === 0) {
      throw new ResponseValidationError(
        '[LLMResponse] choices array cannot be empty.',
      );
    }
    if (!props.usage) {
      throw new Error('[LLMResponse] usage is required.');
    }

    this.id = props.id;
    this.model = props.model;
    this.choices = Object.freeze([...props.choices]);
    this.usage = props.usage;
    this.providerRequestId = props.providerRequestId;
    this.createdAt = props.createdAt ?? new Date();
    Object.freeze(this);
  }

  static create(props: Readonly<LLMResponseProps>): LLMResponse {
    return new LLMResponse(props);
  }

  get primaryChoice(): LLMChoice {
    const choice = this.choices[0];
    if (!choice) {
      throw new ResponseValidationError(
        '[LLMResponse] Primary choice unavailable.',
      );
    }
    return choice;
  }
}

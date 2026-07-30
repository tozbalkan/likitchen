import type { LLMContentPart } from './llm-content-part';
import { createTextPart } from './llm-content-part';

export type LLMRole = 'system' | 'user' | 'assistant';

export interface LLMMessageProps {
  readonly role: LLMRole;
  readonly parts: ReadonlyArray<LLMContentPart>;
}

export class LLMMessage {
  readonly role: LLMRole;
  readonly parts: ReadonlyArray<LLMContentPart>;

  private constructor(props: Readonly<LLMMessageProps>) {
    if (!props.role || !['system', 'user', 'assistant'].includes(props.role)) {
      throw new Error(`[LLMMessage] Invalid role: '${props.role}'.`);
    }
    if (!props.parts || props.parts.length === 0) {
      throw new Error('[LLMMessage] parts array cannot be empty.');
    }

    this.role = props.role;
    this.parts = Object.freeze([...props.parts]);
    Object.freeze(this);
  }

  static create(props: Readonly<LLMMessageProps>): LLMMessage {
    return new LLMMessage(props);
  }

  static fromText(role: LLMRole, text: string): LLMMessage {
    return new LLMMessage({
      role,
      parts: [createTextPart(text)],
    });
  }

  get textContent(): string {
    return this.parts
      .filter(
        (part): part is { type: 'text'; text: string } => part.type === 'text',
      )
      .map((part) => part.text)
      .join('\n');
  }
}

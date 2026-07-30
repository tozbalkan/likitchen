import type { Brand, Instant, CorrelationId } from '../../../shared/types';
import type { ToolId } from './tool-definition';
import type { ToolArguments } from './tool-arguments';

export type InvocationId = Brand<string, 'InvocationId'>;

export interface ToolInvocationProps {
  readonly invocationId: InvocationId;
  readonly toolId: ToolId;
  readonly arguments: ToolArguments;
  readonly correlationId: CorrelationId;
  readonly startedAt?: Instant | undefined;
}

export class ToolInvocation {
  readonly invocationId: InvocationId;
  readonly toolId: ToolId;
  readonly arguments: ToolArguments;
  readonly correlationId: CorrelationId;
  readonly startedAt: Instant;

  private constructor(props: Readonly<ToolInvocationProps>) {
    if (!props.invocationId || props.invocationId.trim() === '') {
      throw new Error('[ToolInvocation] invocationId cannot be empty.');
    }
    if (!props.toolId || props.toolId.trim() === '') {
      throw new Error('[ToolInvocation] toolId cannot be empty.');
    }
    if (!props.arguments) {
      throw new Error('[ToolInvocation] arguments is required.');
    }
    if (!props.correlationId) {
      throw new Error('[ToolInvocation] correlationId is required.');
    }

    this.invocationId = props.invocationId;
    this.toolId = props.toolId;
    this.arguments = props.arguments;
    this.correlationId = props.correlationId;
    this.startedAt = props.startedAt ?? new Date();
    Object.freeze(this);
  }

  static create(props: Readonly<ToolInvocationProps>): ToolInvocation {
    return new ToolInvocation(props);
  }
}

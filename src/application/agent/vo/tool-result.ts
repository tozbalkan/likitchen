import type { Instant } from '../../../shared/types';
import type { ToolId } from './tool-definition';
import type { InvocationId } from './tool-invocation';

export type ToolResultStatus = 'success' | 'failure';

export interface ToolResultProps {
  readonly invocationId: InvocationId;
  readonly toolId: ToolId;
  readonly status: ToolResultStatus;
  readonly output: string;
  readonly executionTimeMs: number;
  readonly createdAt?: Instant | undefined;
}

export class ToolResult {
  readonly invocationId: InvocationId;
  readonly toolId: ToolId;
  readonly status: ToolResultStatus;
  readonly output: string;
  readonly executionTimeMs: number;
  readonly createdAt: Instant;

  private constructor(props: Readonly<ToolResultProps>) {
    if (!props.invocationId) {
      throw new Error('[ToolResult] invocationId is required.');
    }
    if (!props.toolId) {
      throw new Error('[ToolResult] toolId is required.');
    }
    if (props.executionTimeMs < 0) {
      throw new Error('[ToolResult] executionTimeMs cannot be negative.');
    }

    this.invocationId = props.invocationId;
    this.toolId = props.toolId;
    this.status = props.status ?? 'success';
    this.output = props.output ?? '';
    this.executionTimeMs = props.executionTimeMs;
    this.createdAt = props.createdAt ?? new Date();
    Object.freeze(this);
  }

  static create(props: Readonly<ToolResultProps>): ToolResult {
    return new ToolResult(props);
  }

  get isSuccess(): boolean {
    return this.status === 'success';
  }
}

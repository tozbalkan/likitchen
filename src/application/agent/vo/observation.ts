import type { Instant } from '../../../shared/types';
import type { ToolId } from './tool-definition';
import type { InvocationId } from './tool-invocation';
import type { ObservationPayload } from './observation-payload';

export type ObservationStatus = 'success' | 'failure';

export interface ObservationProps {
  readonly observationId: string;
  readonly toolId: ToolId;
  readonly invocationId: InvocationId;
  readonly status?: ObservationStatus | undefined;
  readonly payload: ObservationPayload;
  readonly executionTimeMs: number;
  readonly timestamp?: Instant | undefined;
}

export class Observation {
  readonly observationId: string;
  readonly toolId: ToolId;
  readonly invocationId: InvocationId;
  readonly status: ObservationStatus;
  readonly payload: ObservationPayload;
  readonly executionTimeMs: number;
  readonly timestamp: Instant;

  private constructor(props: Readonly<ObservationProps>) {
    if (!props.observationId || props.observationId.trim() === '') {
      throw new Error('[Observation] observationId is required.');
    }
    if (!props.toolId) {
      throw new Error('[Observation] toolId is required.');
    }
    if (!props.invocationId) {
      throw new Error('[Observation] invocationId is required.');
    }
    if (!props.payload) {
      throw new Error('[Observation] payload is required.');
    }
    if (props.executionTimeMs < 0) {
      throw new Error('[Observation] executionTimeMs cannot be negative.');
    }

    this.observationId = props.observationId;
    this.toolId = props.toolId;
    this.invocationId = props.invocationId;
    this.status = props.status ?? 'success';
    this.payload = props.payload;
    this.executionTimeMs = props.executionTimeMs;
    this.timestamp = props.timestamp ?? new Date();
    Object.freeze(this);
  }

  static create(props: Readonly<ObservationProps>): Observation {
    return new Observation(props);
  }

  get isSuccess(): boolean {
    return this.status === 'success';
  }
}

import type { Instant } from '../../../shared/types';
import type { ModelDescriptor } from './model-descriptor';

export interface StreamMetadataProps {
  readonly streamId: string;
  readonly model: ModelDescriptor;
  readonly startedAt?: Instant | undefined;
}

export class StreamMetadata {
  readonly streamId: string;
  readonly model: ModelDescriptor;
  readonly startedAt: Instant;

  private constructor(props: Readonly<StreamMetadataProps>) {
    if (!props.streamId || props.streamId.trim() === '') {
      throw new Error('[StreamMetadata] streamId is required.');
    }
    if (!props.model) {
      throw new Error('[StreamMetadata] model is required.');
    }

    this.streamId = props.streamId;
    this.model = props.model;
    this.startedAt = props.startedAt ?? new Date();
    Object.freeze(this);
  }

  static create(props: Readonly<StreamMetadataProps>): StreamMetadata {
    return new StreamMetadata(props);
  }
}

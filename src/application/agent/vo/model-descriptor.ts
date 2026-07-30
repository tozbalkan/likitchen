import type { Brand } from '../../../shared/types';

export type ProviderId = Brand<string, 'ProviderId'>;
export type ModelId = Brand<string, 'ModelId'>;

export interface ModelDescriptorProps {
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly deploymentName?: string;
}

export class ModelDescriptor {
  readonly providerId: ProviderId;
  readonly modelId: ModelId;
  readonly deploymentName?: string;

  private constructor(props: Readonly<ModelDescriptorProps>) {
    if (!props.providerId || props.providerId.trim() === '') {
      throw new Error('[ModelDescriptor] providerId cannot be empty.');
    }
    if (!props.modelId || props.modelId.trim() === '') {
      throw new Error('[ModelDescriptor] modelId cannot be empty.');
    }
    this.providerId = props.providerId;
    this.modelId = props.modelId;
    if (props.deploymentName !== undefined) {
      this.deploymentName = props.deploymentName;
    }
    Object.freeze(this);
  }

  static create(props: Readonly<ModelDescriptorProps>): ModelDescriptor {
    return new ModelDescriptor(props);
  }

  equals(other: ModelDescriptor | null | undefined): boolean {
    if (!other) return false;
    return (
      this.providerId === other.providerId &&
      this.modelId === other.modelId &&
      this.deploymentName === other.deploymentName
    );
  }
}

import { VariablePersistencePolicyType } from './variable-persistence-policy';

export type VariableScope = 'GLOBAL' | 'NODE_LOCAL' | 'TRANSIENT';

export interface VariableReferenceProps {
  readonly key: string;
  readonly value: unknown;
  readonly type: string;
  readonly scope: VariableScope;
  readonly persistencePolicy: VariablePersistencePolicyType;
  readonly mutable: boolean;
  readonly producerNodeId?: string | undefined;
  readonly consumerNodeIds?: ReadonlyArray<string> | undefined;
}

export class VariableReference {
  readonly key: string;
  readonly value: unknown;
  readonly type: string;
  readonly scope: VariableScope;
  readonly persistencePolicy: VariablePersistencePolicyType;
  readonly mutable: boolean;
  readonly producerNodeId?: string | undefined;
  readonly consumerNodeIds: ReadonlyArray<string>;

  constructor(props: VariableReferenceProps) {
    this.key = props.key;
    this.value = props.value;
    this.type = props.type;
    this.scope = props.scope;
    this.persistencePolicy = props.persistencePolicy;
    this.mutable = props.mutable;
    this.producerNodeId = props.producerNodeId;
    this.consumerNodeIds = Object.freeze(
      props.consumerNodeIds ? [...props.consumerNodeIds] : [],
    );
    Object.freeze(this);
  }

  static createGlobal(
    key: string,
    value: unknown,
    type: string = 'string',
  ): VariableReference {
    return new VariableReference({
      key,
      value,
      type,
      scope: 'GLOBAL',
      persistencePolicy: 'CHECKPOINT',
      mutable: true,
    });
  }
}

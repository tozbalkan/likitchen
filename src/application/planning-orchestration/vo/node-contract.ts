export interface NodePortDefinition {
  readonly portName: string;
  readonly type: string;
  readonly required: boolean;
}

export interface NodeContractProps {
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly inputPorts?: ReadonlyArray<NodePortDefinition> | undefined;
  readonly outputPorts?: ReadonlyArray<NodePortDefinition> | undefined;
}

export class NodeContract {
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly inputPorts: ReadonlyArray<NodePortDefinition>;
  readonly outputPorts: ReadonlyArray<NodePortDefinition>;

  constructor(props: NodeContractProps) {
    this.inputSchema = Object.freeze({ ...props.inputSchema });
    this.outputSchema = Object.freeze({ ...props.outputSchema });
    this.inputPorts = Object.freeze(
      props.inputPorts ? [...props.inputPorts] : [],
    );
    this.outputPorts = Object.freeze(
      props.outputPorts ? [...props.outputPorts] : [],
    );
    Object.freeze(this);
  }

  static createDefault(): NodeContract {
    return new NodeContract({
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
    });
  }
}

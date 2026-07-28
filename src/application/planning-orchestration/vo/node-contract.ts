export interface NodePortDefinition {
  readonly portName: string;
  readonly type: string;
  readonly required: boolean;
  readonly nullable?: boolean | undefined;
}

export interface NodeContractProps {
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly inputPorts?: ReadonlyArray<NodePortDefinition> | undefined;
  readonly outputPorts?: ReadonlyArray<NodePortDefinition> | undefined;
  readonly streamingOutput?: boolean | undefined;
  readonly artifactOutput?: boolean | undefined;
  readonly timeoutExpectationsMs?: number | undefined;
}

export class NodeContract {
  readonly inputSchema: Readonly<Record<string, unknown>>;
  readonly outputSchema: Readonly<Record<string, unknown>>;
  readonly inputPorts: ReadonlyArray<NodePortDefinition>;
  readonly outputPorts: ReadonlyArray<NodePortDefinition>;
  readonly streamingOutput: boolean;
  readonly artifactOutput: boolean;
  readonly timeoutExpectationsMs?: number | undefined;

  constructor(props: NodeContractProps) {
    this.inputSchema = Object.freeze({ ...props.inputSchema });
    this.outputSchema = Object.freeze({ ...props.outputSchema });
    this.inputPorts = Object.freeze(
      props.inputPorts ? [...props.inputPorts] : [],
    );
    this.outputPorts = Object.freeze(
      props.outputPorts ? [...props.outputPorts] : [],
    );
    this.streamingOutput = props.streamingOutput ?? false;
    this.artifactOutput = props.artifactOutput ?? false;
    this.timeoutExpectationsMs = props.timeoutExpectationsMs;
    Object.freeze(this);
  }

  static createDefault(): NodeContract {
    return new NodeContract({
      inputSchema: { type: 'object' },
      outputSchema: { type: 'object' },
    });
  }
}

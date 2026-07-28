export interface AgentDefinitionProps {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly systemPromptReference: string;
  readonly toolIds: readonly string[];
  readonly modelSelectionPolicy: string;
  readonly memoryPolicy: string;
  readonly toolPolicy: string;
  readonly guardPolicy: string;
  readonly outputSchema?: Record<string, unknown> | undefined;
  readonly timeoutMs?: number | undefined;
}

export class AgentDefinition {
  readonly id: string;
  readonly name: string;
  readonly version: string;
  readonly systemPromptReference: string;
  readonly toolIds: readonly string[];
  readonly modelSelectionPolicy: string;
  readonly memoryPolicy: string;
  readonly toolPolicy: string;
  readonly guardPolicy: string;
  readonly outputSchema?: Record<string, unknown> | undefined;
  readonly timeoutMs?: number | undefined;

  private constructor(props: Readonly<AgentDefinitionProps>) {
    if (!props.id || props.id.trim() === '') {
      throw new Error('[AgentDefinition] id cannot be empty.');
    }
    this.id = props.id;
    this.name = props.name;
    this.version = props.version;
    this.systemPromptReference = props.systemPromptReference;
    this.toolIds = Object.freeze([...props.toolIds]);
    this.modelSelectionPolicy = props.modelSelectionPolicy;
    this.memoryPolicy = props.memoryPolicy;
    this.toolPolicy = props.toolPolicy;
    this.guardPolicy = props.guardPolicy;
    this.outputSchema = props.outputSchema
      ? Object.freeze({ ...props.outputSchema })
      : undefined;
    this.timeoutMs = props.timeoutMs;

    Object.freeze(this);
  }

  static create(props: Readonly<AgentDefinitionProps>): AgentDefinition {
    return new AgentDefinition(props);
  }
}

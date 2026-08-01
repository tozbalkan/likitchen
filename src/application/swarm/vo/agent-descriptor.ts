export interface AgentDescriptorProps {
  readonly agentId: string;
  readonly role: string;
  readonly capabilities?: readonly string[] | undefined;
}

export class AgentDescriptor {
  readonly agentId: string;
  readonly role: string;
  readonly capabilities: readonly string[];

  private constructor(props: Readonly<AgentDescriptorProps>) {
    if (!props.agentId || props.agentId.trim() === '') {
      throw new Error('[AgentDescriptor] agentId is required.');
    }
    if (!props.role || props.role.trim() === '') {
      throw new Error('[AgentDescriptor] role is required.');
    }

    this.agentId = props.agentId;
    this.role = props.role;
    this.capabilities = Object.freeze([...(props.capabilities ?? [])]);
    Object.freeze(this);
  }

  static create(props: Readonly<AgentDescriptorProps>): AgentDescriptor {
    return new AgentDescriptor(props);
  }
}

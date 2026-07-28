export interface ToolDomainEventProps {
  readonly eventId: string;
  readonly eventType:
    | 'ToolRegistered'
    | 'ToolUpdated'
    | 'ToolExecuted'
    | 'ToolExecutionFailed'
    | 'ToolHealthChanged';
  readonly toolId: string;
  readonly instanceId?: string | undefined;
  readonly tenantId: string;
  readonly actor: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: Date;
}

export class ToolDomainEvent {
  readonly eventId: string;
  readonly eventType:
    | 'ToolRegistered'
    | 'ToolUpdated'
    | 'ToolExecuted'
    | 'ToolExecutionFailed'
    | 'ToolHealthChanged';
  readonly toolId: string;
  readonly instanceId?: string | undefined;
  readonly tenantId: string;
  readonly actor: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: Date;

  constructor(props: ToolDomainEventProps) {
    this.eventId = props.eventId;
    this.eventType = props.eventType;
    this.toolId = props.toolId;
    this.instanceId = props.instanceId;
    this.tenantId = props.tenantId;
    this.actor = props.actor;
    this.payload = Object.freeze({ ...props.payload });
    this.timestamp = new Date(props.timestamp);
    Object.freeze(this);
  }

  static create(
    props: Omit<ToolDomainEventProps, 'eventId' | 'timestamp'>,
  ): ToolDomainEvent {
    return new ToolDomainEvent({
      ...props,
      eventId: `tevt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    });
  }
}

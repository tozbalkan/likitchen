export interface PlanDomainEventProps {
  readonly eventId: string;
  readonly eventType:
    | 'PlanCreated'
    | 'PlanVersioned'
    | 'InstanceStarted'
    | 'CheckpointWaiting'
    | 'NodeCompleted'
    | 'NodeFailed'
    | 'PlanCompleted';
  readonly planId: string;
  readonly instanceId?: string | undefined;
  readonly tenantId: string;
  readonly actor: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: Date;
}

export class PlanDomainEvent {
  readonly eventId: string;
  readonly eventType:
    | 'PlanCreated'
    | 'PlanVersioned'
    | 'InstanceStarted'
    | 'CheckpointWaiting'
    | 'NodeCompleted'
    | 'NodeFailed'
    | 'PlanCompleted';
  readonly planId: string;
  readonly instanceId?: string | undefined;
  readonly tenantId: string;
  readonly actor: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: Date;

  constructor(props: PlanDomainEventProps) {
    this.eventId = props.eventId;
    this.eventType = props.eventType;
    this.planId = props.planId;
    this.instanceId = props.instanceId;
    this.tenantId = props.tenantId;
    this.actor = props.actor;
    this.payload = Object.freeze({ ...props.payload });
    this.timestamp = new Date(props.timestamp);
    Object.freeze(this);
  }

  static create(
    props: Omit<PlanDomainEventProps, 'eventId' | 'timestamp'>,
  ): PlanDomainEvent {
    return new PlanDomainEvent({
      ...props,
      eventId: `pevt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    });
  }
}

export interface PromptAuthoringEventProps {
  readonly eventId: string;
  readonly eventType:
    | 'WorkspaceCreated'
    | 'DraftUpdated'
    | 'LeaseAcquired'
    | 'LeaseReleased'
    | 'ReviewRequested'
    | 'ReviewApproved'
    | 'ReviewRejected'
    | 'PromptPublished';
  readonly workspaceId: string;
  readonly tenantId: string;
  readonly actor: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: Date;
}

export class PromptAuthoringEvent {
  readonly eventId: string;
  readonly eventType:
    | 'WorkspaceCreated'
    | 'DraftUpdated'
    | 'LeaseAcquired'
    | 'LeaseReleased'
    | 'ReviewRequested'
    | 'ReviewApproved'
    | 'ReviewRejected'
    | 'PromptPublished';
  readonly workspaceId: string;
  readonly tenantId: string;
  readonly actor: string;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly timestamp: Date;

  constructor(props: PromptAuthoringEventProps) {
    this.eventId = props.eventId;
    this.eventType = props.eventType;
    this.workspaceId = props.workspaceId;
    this.tenantId = props.tenantId;
    this.actor = props.actor;
    this.payload = Object.freeze({ ...props.payload });
    this.timestamp = new Date(props.timestamp);
    Object.freeze(this);
  }

  static create(
    props: Omit<PromptAuthoringEventProps, 'eventId' | 'timestamp'>,
  ): PromptAuthoringEvent {
    return new PromptAuthoringEvent({
      ...props,
      eventId: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date(),
    });
  }
}

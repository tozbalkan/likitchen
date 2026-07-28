export interface PromotionEventProps {
  readonly id: string;
  readonly promptId: string;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly environment: string;
  readonly actor: string;
  readonly reason: string;
  readonly timestamp: Date;
}

export class PromotionEvent {
  readonly id: string;
  readonly promptId: string;
  readonly fromVersion: string;
  readonly toVersion: string;
  readonly environment: string;
  readonly actor: string;
  readonly reason: string;
  readonly timestamp: Date;

  constructor(props: Readonly<PromotionEventProps>) {
    this.id = props.id;
    this.promptId = props.promptId;
    this.fromVersion = props.fromVersion;
    this.toVersion = props.toVersion;
    this.environment = props.environment;
    this.actor = props.actor;
    this.reason = props.reason;
    this.timestamp = props.timestamp;

    Object.freeze(this);
  }

  static create(props: Readonly<PromotionEventProps>): PromotionEvent {
    return new PromotionEvent(props);
  }
}

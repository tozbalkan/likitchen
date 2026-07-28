export type SessionStatus =
  'IDLE' | 'EXECUTING' | 'STOPPED' | 'FAILED' | 'CANCELLED';

export interface RuntimeSessionProps {
  readonly sessionId: string;
  readonly agentId: string;
  readonly tenantId: string;
  readonly status: SessionStatus;
  readonly currentStageIndex: number;
  readonly startedAt: Date;
  readonly lastActiveAt: Date;
}

export class RuntimeSession {
  readonly sessionId: string;
  readonly agentId: string;
  readonly tenantId: string;
  readonly status: SessionStatus;
  readonly currentStageIndex: number;
  readonly startedAt: Date;
  readonly lastActiveAt: Date;

  constructor(props: Readonly<RuntimeSessionProps>) {
    this.sessionId = props.sessionId;
    this.agentId = props.agentId;
    this.tenantId = props.tenantId;
    this.status = props.status;
    this.currentStageIndex = props.currentStageIndex;
    this.startedAt = props.startedAt;
    this.lastActiveAt = props.lastActiveAt;
    Object.freeze(this);
  }

  static create(
    sessionId: string,
    agentId: string,
    tenantId: string,
  ): RuntimeSession {
    const now = new Date();
    return new RuntimeSession({
      sessionId,
      agentId,
      tenantId,
      status: 'IDLE',
      currentStageIndex: 0,
      startedAt: now,
      lastActiveAt: now,
    });
  }

  withStatus(status: SessionStatus, stageIndex?: number): RuntimeSession {
    return new RuntimeSession({
      sessionId: this.sessionId,
      agentId: this.agentId,
      tenantId: this.tenantId,
      status,
      currentStageIndex: stageIndex ?? this.currentStageIndex,
      startedAt: this.startedAt,
      lastActiveAt: new Date(),
    });
  }
}

export type WorkspaceLeaseState = 'UNLOCKED' | 'LOCKED' | 'EXPIRED';
export type LeaseTakeoverPolicy =
  'DENY' | 'ALLOW_ADMIN' | 'FORCE_AFTER_TIMEOUT';

export interface WorkspaceLeaseProps {
  readonly workspaceId: string;
  readonly ownerId: string;
  readonly leasedAt: Date;
  readonly heartbeatAt: Date;
  readonly expiresAt: Date;
  readonly takeoverPolicy: LeaseTakeoverPolicy;
}

export class WorkspaceLease {
  readonly workspaceId: string;
  readonly ownerId: string;
  readonly leasedAt: Date;
  readonly heartbeatAt: Date;
  readonly expiresAt: Date;
  readonly takeoverPolicy: LeaseTakeoverPolicy;

  constructor(props: WorkspaceLeaseProps) {
    this.workspaceId = props.workspaceId;
    this.ownerId = props.ownerId;
    this.leasedAt = new Date(props.leasedAt);
    this.heartbeatAt = new Date(props.heartbeatAt);
    this.expiresAt = new Date(props.expiresAt);
    this.takeoverPolicy = props.takeoverPolicy;

    Object.freeze(this);
  }

  static create(
    workspaceId: string,
    ownerId: string,
    ttlMs: number = 30000,
    takeoverPolicy: LeaseTakeoverPolicy = 'ALLOW_ADMIN',
  ): WorkspaceLease {
    const now = new Date();
    return new WorkspaceLease({
      workspaceId,
      ownerId,
      leasedAt: now,
      heartbeatAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      takeoverPolicy,
    });
  }

  getState(now: Date = new Date()): WorkspaceLeaseState {
    if (now.getTime() > this.expiresAt.getTime()) {
      return 'EXPIRED';
    }
    return 'LOCKED';
  }

  isExpired(now: Date = new Date()): boolean {
    return now.getTime() > this.expiresAt.getTime();
  }

  heartbeat(ttlMs: number = 30000, now: Date = new Date()): WorkspaceLease {
    return new WorkspaceLease({
      workspaceId: this.workspaceId,
      ownerId: this.ownerId,
      leasedAt: this.leasedAt,
      heartbeatAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
      takeoverPolicy: this.takeoverPolicy,
    });
  }
}

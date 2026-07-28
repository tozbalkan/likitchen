export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface ExecutionCheckpointProps {
  readonly checkpointId: string;
  readonly nodeId: string;
  readonly approvalStatus: ApprovalStatus;
  readonly approverId?: string | undefined;
  readonly comments?: string | undefined;
  readonly createdAt: Date;
}

export class ExecutionCheckpoint {
  readonly checkpointId: string;
  readonly nodeId: string;
  readonly approvalStatus: ApprovalStatus;
  readonly approverId?: string | undefined;
  readonly comments?: string | undefined;
  readonly createdAt: Date;

  constructor(props: ExecutionCheckpointProps) {
    this.checkpointId = props.checkpointId;
    this.nodeId = props.nodeId;
    this.approvalStatus = props.approvalStatus;
    this.approverId = props.approverId;
    this.comments = props.comments;
    this.createdAt = new Date(props.createdAt);
    Object.freeze(this);
  }

  static createPending(
    checkpointId: string,
    nodeId: string,
  ): ExecutionCheckpoint {
    return new ExecutionCheckpoint({
      checkpointId,
      nodeId,
      approvalStatus: 'PENDING',
      createdAt: new Date(),
    });
  }

  approve(approverId: string, comments?: string): ExecutionCheckpoint {
    return new ExecutionCheckpoint({
      ...this,
      approvalStatus: 'APPROVED',
      approverId,
      comments,
    });
  }

  reject(approverId: string, comments?: string): ExecutionCheckpoint {
    return new ExecutionCheckpoint({
      ...this,
      approvalStatus: 'REJECTED',
      approverId,
      comments,
    });
  }
}

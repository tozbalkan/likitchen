export interface ExecutionCursorProps {
  readonly completedNodeIds: ReadonlyArray<string>;
  readonly runningNodeIds: ReadonlyArray<string>;
  readonly waitingNodeIds: ReadonlyArray<string>;
  readonly pendingNodeIds: ReadonlyArray<string>;
  readonly lastActiveNodeId?: string | undefined;
}

export class ExecutionCursor {
  readonly completedNodeIds: ReadonlyArray<string>;
  readonly runningNodeIds: ReadonlyArray<string>;
  readonly waitingNodeIds: ReadonlyArray<string>;
  readonly pendingNodeIds: ReadonlyArray<string>;
  readonly lastActiveNodeId?: string | undefined;

  constructor(props: ExecutionCursorProps) {
    this.completedNodeIds = Object.freeze([...props.completedNodeIds]);
    this.runningNodeIds = Object.freeze([...props.runningNodeIds]);
    this.waitingNodeIds = Object.freeze([...props.waitingNodeIds]);
    this.pendingNodeIds = Object.freeze([...props.pendingNodeIds]);
    this.lastActiveNodeId = props.lastActiveNodeId;
    Object.freeze(this);
  }

  static createInitial(allNodeIds: ReadonlyArray<string>): ExecutionCursor {
    return new ExecutionCursor({
      completedNodeIds: [],
      runningNodeIds: [],
      waitingNodeIds: [],
      pendingNodeIds: allNodeIds,
    });
  }

  markRunning(nodeId: string): ExecutionCursor {
    const pending = this.pendingNodeIds.filter((id) => id !== nodeId);
    const waiting = this.waitingNodeIds.filter((id) => id !== nodeId);
    const running = [...new Set([...this.runningNodeIds, nodeId])];
    return new ExecutionCursor({
      ...this,
      pendingNodeIds: pending,
      waitingNodeIds: waiting,
      runningNodeIds: running,
      lastActiveNodeId: nodeId,
    });
  }

  markCompleted(nodeId: string): ExecutionCursor {
    const pending = this.pendingNodeIds.filter((id) => id !== nodeId);
    const running = this.runningNodeIds.filter((id) => id !== nodeId);
    const waiting = this.waitingNodeIds.filter((id) => id !== nodeId);
    const completed = [...new Set([...this.completedNodeIds, nodeId])];
    return new ExecutionCursor({
      ...this,
      pendingNodeIds: pending,
      runningNodeIds: running,
      waitingNodeIds: waiting,
      completedNodeIds: completed,
      lastActiveNodeId: nodeId,
    });
  }

  markWaiting(nodeId: string): ExecutionCursor {
    const pending = this.pendingNodeIds.filter((id) => id !== nodeId);
    const running = this.runningNodeIds.filter((id) => id !== nodeId);
    const waiting = [...new Set([...this.waitingNodeIds, nodeId])];
    return new ExecutionCursor({
      ...this,
      pendingNodeIds: pending,
      runningNodeIds: running,
      waitingNodeIds: waiting,
      lastActiveNodeId: nodeId,
    });
  }

  markFailed(nodeId: string): ExecutionCursor {
    const pending = this.pendingNodeIds.filter((id) => id !== nodeId);
    const running = this.runningNodeIds.filter((id) => id !== nodeId);
    const waiting = this.waitingNodeIds.filter((id) => id !== nodeId);
    return new ExecutionCursor({
      ...this,
      pendingNodeIds: pending,
      runningNodeIds: running,
      waitingNodeIds: waiting,
      lastActiveNodeId: nodeId,
    });
  }
}

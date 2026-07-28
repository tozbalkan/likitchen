export type NodeExecutionPolicyType =
  | 'CONTINUE_ON_FAILURE'
  | 'ABORT_PLAN'
  | 'RUN_COMPENSATION'
  | 'SKIP_NODE'
  | 'WAIT_FOR_APPROVAL';

export class NodeExecutionPolicy {
  constructor(public readonly type: NodeExecutionPolicyType = 'ABORT_PLAN') {
    Object.freeze(this);
  }
}

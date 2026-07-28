import { TenantContext } from '../../identity/tenant-context';
import { PlanNode } from '../graph/plan-node';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import type {
  NodeExecutionAdapterPort,
  NodeExecutionAdapterResult,
} from './node-execution-adapter-port';

export class ApprovalExecutionAdapter implements NodeExecutionAdapterPort {
  readonly behaviorType = 'APPROVAL';

  async executeNode(
    _tenant: Readonly<TenantContext>,
    node: Readonly<PlanNode>,
    instance: Readonly<ExecutionPlanInstance>,
  ): Promise<NodeExecutionAdapterResult> {
    const cp = instance.checkpoints.find((c) => c.nodeId === node.nodeId);
    if (cp && cp.approvalStatus === 'APPROVED') {
      return { success: true, outputs: { approvedBy: cp.approverId } };
    }
    if (cp && cp.approvalStatus === 'REJECTED') {
      return {
        success: false,
        error: `[ApprovalExecutionAdapter] Checkpoint rejected by '${cp.approverId}'.`,
      };
    }

    return {
      success: true,
      isCheckpointWaiting: true,
      outputs: { checkpointState: 'PENDING' },
    };
  }
}

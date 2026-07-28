import { TenantContext } from '../../identity/tenant-context';
import { PlanNode } from '../graph/plan-node';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';

export interface NodeExecutionAdapterResult {
  readonly success: boolean;
  readonly outputs?: Readonly<Record<string, unknown>> | undefined;
  readonly isCheckpointWaiting?: boolean | undefined;
  readonly error?: string | undefined;
}

export interface NodeExecutionAdapterPort {
  readonly behaviorType: string;
  executeNode(
    tenant: Readonly<TenantContext>,
    node: Readonly<PlanNode>,
    instance: Readonly<ExecutionPlanInstance>,
  ): Promise<NodeExecutionAdapterResult>;
}

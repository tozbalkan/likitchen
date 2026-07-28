import { TenantContext } from '../../identity/tenant-context';
import { PlanNode } from '../graph/plan-node';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import type {
  NodeExecutionAdapterPort,
  NodeExecutionAdapterResult,
} from '../adapters/node-execution-adapter-port';

export class ExecutionDispatcher {
  private readonly adapters = new Map<string, NodeExecutionAdapterPort>();

  registerAdapter(adapter: NodeExecutionAdapterPort): void {
    this.adapters.set(adapter.behaviorType, adapter);
  }

  async dispatchNode(
    tenant: Readonly<TenantContext>,
    node: Readonly<PlanNode>,
    instance: Readonly<ExecutionPlanInstance>,
  ): Promise<NodeExecutionAdapterResult> {
    const adapter = this.adapters.get(node.behaviorType);
    if (!adapter) {
      throw new Error(
        `[ExecutionDispatcher] No NodeExecutionAdapter found for behavior '${node.behaviorType}'.`,
      );
    }

    return adapter.executeNode(tenant, node, instance);
  }
}

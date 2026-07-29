import { TenantContext } from '../../identity/tenant-context';
import { PlanNode } from '../graph/plan-node';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import type {
  NodeExecutionAdapterPort,
  NodeExecutionAdapterResult,
} from './node-execution-adapter-port';

export class ToolExecutionAdapter implements NodeExecutionAdapterPort {
  readonly behaviorType = 'TOOL';

  async executeNode(
    _tenant: Readonly<TenantContext>,
    node: Readonly<PlanNode>,
    _instance: Readonly<ExecutionPlanInstance>,
  ): Promise<NodeExecutionAdapterResult> {
    const toolId = String(node.payload['toolId'] ?? 'default-tool');
    const shouldFail = node.payload['shouldFail'] === true;

    if (shouldFail) {
      return {
        success: false,
        error: `[ToolExecutionAdapter] Tool '${toolId}' execution failed as instructed.`,
      };
    }

    return {
      success: true,
      outputs: {
        toolResult: `Executed tool '${toolId}' via Capability-023`,
        nodeId: node.nodeId,
        inputTokens: 50,
        outputTokens: 50,
        costUSD: 0.1,
      },
    };
  }
}

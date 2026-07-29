import { TenantContext } from '../../identity/tenant-context';
import { PlanNode } from '../graph/plan-node';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import type {
  NodeExecutionAdapterPort,
  NodeExecutionAdapterResult,
} from './node-execution-adapter-port';

export class PromptExecutionAdapter implements NodeExecutionAdapterPort {
  readonly behaviorType = 'PROMPT';

  async executeNode(
    _tenant: Readonly<TenantContext>,
    node: Readonly<PlanNode>,
    _instance: Readonly<ExecutionPlanInstance>,
  ): Promise<NodeExecutionAdapterResult> {
    const promptId = String(node.payload['promptId'] ?? 'default-prompt');
    return {
      success: true,
      outputs: {
        renderedPrompt: `Rendered prompt content for '${promptId}'`,
        nodeId: node.nodeId,
        inputTokens: 120,
        outputTokens: 80,
        costUSD: 0.05,
      },
    };
  }
}

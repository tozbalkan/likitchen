import { TenantContext } from '../../identity/tenant-context';
import type {
  PlanningStrategyPort,
  GeneratedPlanStructure,
} from './planning-strategy-port';
import { PlanNode } from '../graph/plan-node';
import { PlanEdge } from '../graph/plan-edge';

export class DeterministicPlannerStrategy implements PlanningStrategyPort {
  readonly strategyName = 'DeterministicPlanner';

  async generatePlan(
    tenant: Readonly<TenantContext>,
    goal: string,
    contextPayload?: Readonly<Record<string, unknown>>,
  ): Promise<GeneratedPlanStructure> {
    const planId = `plan-${tenant.tenantId}-${Date.now().toString(36)}`;
    const promptNode = new PlanNode({
      nodeId: 'node-prompt-analyze',
      name: 'Analyze Goal Prompt',
      behaviorType: 'PROMPT',
      payload: { promptId: 'prompt-analyzer', goal, ...contextPayload },
    });

    const toolNode = new PlanNode({
      nodeId: 'node-tool-execute',
      name: 'Execute Subtask Tool',
      behaviorType: 'TOOL',
      payload: { toolId: 'tool-executor', goal },
    });

    const approvalNode = new PlanNode({
      nodeId: 'node-approval-check',
      name: 'Human Approval Checkpoint',
      behaviorType: 'APPROVAL',
    });

    const edges = [
      new PlanEdge({
        edgeId: 'e-1',
        sourceNodeId: 'node-prompt-analyze',
        targetNodeId: 'node-tool-execute',
      }),
      new PlanEdge({
        edgeId: 'e-2',
        sourceNodeId: 'node-tool-execute',
        targetNodeId: 'node-approval-check',
      }),
    ];

    return {
      planId,
      name: `Plan for: ${goal.slice(0, 30)}`,
      description: `Generated plan for goal '${goal}'`,
      nodes: [promptNode, toolNode, approvalNode],
      edges,
    };
  }
}

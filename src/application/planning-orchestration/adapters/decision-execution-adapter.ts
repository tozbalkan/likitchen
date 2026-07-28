import { TenantContext } from '../../identity/tenant-context';
import { PlanNode } from '../graph/plan-node';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import type {
  NodeExecutionAdapterPort,
  NodeExecutionAdapterResult,
} from './node-execution-adapter-port';
import type { ConditionEvaluatorPort } from '../ports/condition-evaluator-port';

export class DecisionExecutionAdapter implements NodeExecutionAdapterPort {
  readonly behaviorType = 'DECISION';

  constructor(private readonly conditionEvaluator: ConditionEvaluatorPort) {}

  async executeNode(
    _tenant: Readonly<TenantContext>,
    node: Readonly<PlanNode>,
    instance: Readonly<ExecutionPlanInstance>,
  ): Promise<NodeExecutionAdapterResult> {
    const condition = String(node.payload['condition'] ?? 'true');
    const varsMap: Record<string, unknown> = {};
    for (const v of instance.variables) {
      varsMap[v.key] = v.value;
    }

    const decisionResult = await this.conditionEvaluator.evaluate(
      condition,
      varsMap,
    );
    return {
      success: true,
      outputs: { decisionResult, node: node.nodeId },
    };
  }
}

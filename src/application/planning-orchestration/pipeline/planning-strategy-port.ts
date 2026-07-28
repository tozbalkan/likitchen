import { TenantContext } from '../../identity/tenant-context';
import { PlanNode } from '../graph/plan-node';
import { PlanEdge } from '../graph/plan-edge';

export interface GeneratedPlanStructure {
  readonly planId: string;
  readonly name: string;
  readonly description: string;
  readonly nodes: ReadonlyArray<PlanNode>;
  readonly edges: ReadonlyArray<PlanEdge>;
}

export interface PlanningStrategyPort {
  readonly strategyName: string;
  generatePlan(
    tenant: Readonly<TenantContext>,
    goal: string,
    contextPayload?: Readonly<Record<string, unknown>>,
  ): Promise<GeneratedPlanStructure>;
}

import { TenantContext } from '../../identity/tenant-context';
import { PlanDefinition } from '../domain/plan-definition';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionGraph } from '../graph/execution-graph';

export interface ExecutionPlanRepositoryPort {
  saveDefinition(
    tenant: Readonly<TenantContext>,
    definition: Readonly<PlanDefinition>,
  ): Promise<void>;
  findDefinitionById(
    tenant: Readonly<TenantContext>,
    planId: string,
  ): Promise<PlanDefinition | undefined>;

  saveGraph(
    tenant: Readonly<TenantContext>,
    graph: Readonly<ExecutionGraph>,
  ): Promise<void>;
  findGraphById(
    tenant: Readonly<TenantContext>,
    graphId: string,
  ): Promise<ExecutionGraph | undefined>;

  saveInstance(
    tenant: Readonly<TenantContext>,
    instance: Readonly<ExecutionPlanInstance>,
  ): Promise<void>;
  findInstanceById(
    tenant: Readonly<TenantContext>,
    instanceId: string,
  ): Promise<ExecutionPlanInstance | undefined>;
  listInstances(
    tenant: Readonly<TenantContext>,
  ): Promise<ReadonlyArray<ExecutionPlanInstance>>;

  claimNodes(
    tenant: Readonly<TenantContext>,
    instanceId: string,
    nodeIds: ReadonlyArray<string>,
    expectedConcurrencyVersion: number,
  ): Promise<ExecutionPlanInstance | undefined>;
}

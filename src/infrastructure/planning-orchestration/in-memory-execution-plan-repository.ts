import type { ExecutionPlanRepositoryPort } from '../../application/planning-orchestration/ports/execution-plan-repository-port';
import { PlanDefinition } from '../../application/planning-orchestration/domain/plan-definition';
import { ExecutionPlanInstance } from '../../application/planning-orchestration/domain/execution-plan-instance';
import { ExecutionGraph } from '../../application/planning-orchestration/graph/execution-graph';
import { TenantContext } from '../../application/identity/tenant-context';

export class InMemoryExecutionPlanRepositoryAdapter implements ExecutionPlanRepositoryPort {
  private readonly definitions = new Map<string, Map<string, PlanDefinition>>();
  private readonly graphs = new Map<string, Map<string, ExecutionGraph>>();
  private readonly instances = new Map<
    string,
    Map<string, ExecutionPlanInstance>
  >();

  private getTenantMap<T>(
    store: Map<string, Map<string, T>>,
    tenantId: string,
  ): Map<string, T> {
    let map = store.get(tenantId);
    if (!map) {
      map = new Map<string, T>();
      store.set(tenantId, map);
    }
    return map;
  }

  async saveDefinition(
    tenant: Readonly<TenantContext>,
    definition: Readonly<PlanDefinition>,
  ): Promise<void> {
    this.getTenantMap(this.definitions, tenant.tenantId).set(
      definition.planId,
      definition as PlanDefinition,
    );
  }

  async findDefinitionById(
    tenant: Readonly<TenantContext>,
    planId: string,
  ): Promise<PlanDefinition | undefined> {
    return this.getTenantMap(this.definitions, tenant.tenantId).get(planId);
  }

  async saveGraph(
    tenant: Readonly<TenantContext>,
    graph: Readonly<ExecutionGraph>,
  ): Promise<void> {
    this.getTenantMap(this.graphs, tenant.tenantId).set(
      graph.graphId,
      graph as ExecutionGraph,
    );
  }

  async findGraphById(
    tenant: Readonly<TenantContext>,
    graphId: string,
  ): Promise<ExecutionGraph | undefined> {
    return this.getTenantMap(this.graphs, tenant.tenantId).get(graphId);
  }

  async saveInstance(
    tenant: Readonly<TenantContext>,
    instance: Readonly<ExecutionPlanInstance>,
  ): Promise<void> {
    this.getTenantMap(this.instances, tenant.tenantId).set(
      instance.instanceId,
      instance as ExecutionPlanInstance,
    );
  }

  async findInstanceById(
    tenant: Readonly<TenantContext>,
    instanceId: string,
  ): Promise<ExecutionPlanInstance | undefined> {
    return this.getTenantMap(this.instances, tenant.tenantId).get(instanceId);
  }

  async listInstances(
    tenant: Readonly<TenantContext>,
  ): Promise<ReadonlyArray<ExecutionPlanInstance>> {
    return Object.freeze(
      Array.from(this.getTenantMap(this.instances, tenant.tenantId).values()),
    );
  }
}

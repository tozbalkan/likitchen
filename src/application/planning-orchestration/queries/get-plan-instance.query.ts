import { TenantContext } from '../../identity/tenant-context';
import { PlanInstanceReadModel } from '../projections/plan-read-model';
import { PlanProjectionBuilder } from '../projections/plan-projection-builder';
import type { ExecutionPlanRepositoryPort } from '../ports/execution-plan-repository-port';

export interface GetPlanInstanceQuery {
  readonly instanceId: string;
  readonly tenantContext: TenantContext;
}

export class GetPlanInstanceQueryHandler {
  constructor(private readonly repository: ExecutionPlanRepositoryPort) {}

  async execute(
    query: GetPlanInstanceQuery,
  ): Promise<PlanInstanceReadModel | undefined> {
    const instance = await this.repository.findInstanceById(
      query.tenantContext,
      query.instanceId,
    );
    if (!instance) return undefined;
    return PlanProjectionBuilder.buildInstanceReadModel(instance);
  }
}

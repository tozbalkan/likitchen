import { TenantContext } from '../../identity/tenant-context';
import { PlanDefinitionReadModel } from '../projections/plan-read-model';
import { PlanProjectionBuilder } from '../projections/plan-projection-builder';
import type { ExecutionPlanRepositoryPort } from '../ports/execution-plan-repository-port';

export interface GetPlanDefinitionQuery {
  readonly planId: string;
  readonly tenantContext: TenantContext;
}

export class GetPlanDefinitionQueryHandler {
  constructor(private readonly repository: ExecutionPlanRepositoryPort) {}

  async execute(
    query: GetPlanDefinitionQuery,
  ): Promise<PlanDefinitionReadModel | undefined> {
    const definition = await this.repository.findDefinitionById(
      query.tenantContext,
      query.planId,
    );
    if (!definition) return undefined;
    return PlanProjectionBuilder.buildDefinitionReadModel(definition);
  }
}

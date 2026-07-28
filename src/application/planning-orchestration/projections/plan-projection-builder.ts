import { PlanDefinition } from '../domain/plan-definition';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import {
  PlanDefinitionReadModel,
  PlanInstanceReadModel,
} from './plan-read-model';

export class PlanProjectionBuilder {
  static buildDefinitionReadModel(
    definition: Readonly<PlanDefinition>,
  ): PlanDefinitionReadModel {
    return Object.freeze({
      planId: definition.planId,
      name: definition.name,
      description: definition.description,
      owner: definition.owner,
      defaultVersion: definition.defaultVersion,
      versionsCount: definition.versions.length,
      createdAtIso: definition.createdAt.toISOString(),
      updatedAtIso: definition.updatedAt.toISOString(),
    });
  }

  static buildInstanceReadModel(
    instance: Readonly<ExecutionPlanInstance>,
  ): PlanInstanceReadModel {
    return Object.freeze({
      instanceId: instance.instanceId,
      tenantId: instance.tenantId,
      planId: instance.planId,
      version: instance.version,
      graphId: instance.graphId,
      state: instance.state,
      completedNodesCount: instance.cursor.completedNodeIds.length,
      runningNodesCount: instance.cursor.runningNodeIds.length,
      waitingNodesCount: instance.cursor.waitingNodeIds.length,
      pendingNodesCount: instance.cursor.pendingNodeIds.length,
      consumedCostUSD: instance.consumedCostUSD,
      createdAtIso: instance.createdAt.toISOString(),
      updatedAtIso: instance.updatedAt.toISOString(),
    });
  }
}

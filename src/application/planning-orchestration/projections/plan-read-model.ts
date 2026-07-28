export interface PlanDefinitionReadModel {
  readonly planId: string;
  readonly name: string;
  readonly description: string;
  readonly owner: string;
  readonly defaultVersion: string;
  readonly versionsCount: number;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

export interface PlanInstanceReadModel {
  readonly instanceId: string;
  readonly tenantId: string;
  readonly planId: string;
  readonly version: string;
  readonly graphId: string;
  readonly state: string;
  readonly completedNodesCount: number;
  readonly runningNodesCount: number;
  readonly waitingNodesCount: number;
  readonly pendingNodesCount: number;
  readonly consumedCostUSD: number;
  readonly createdAtIso: string;
  readonly updatedAtIso: string;
}

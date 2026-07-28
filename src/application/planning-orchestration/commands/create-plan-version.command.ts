import { TenantContext } from '../../identity/tenant-context';
import { PlanVersion } from '../domain/plan-version';
import { ExecutionGraph } from '../graph/execution-graph';
import { PlanNode } from '../graph/plan-node';
import { PlanEdge } from '../graph/plan-edge';
import { PlanBudget } from '../vo/plan-budget';
import type { ExecutionPlanRepositoryPort } from '../ports/execution-plan-repository-port';

export interface CreatePlanVersionCommand {
  readonly planId: string;
  readonly newVersion: string;
  readonly nodes: ReadonlyArray<PlanNode>;
  readonly edges: ReadonlyArray<PlanEdge>;
  readonly budget?: PlanBudget | undefined;
  readonly tenantContext: TenantContext;
}

export class CreatePlanVersionCommandHandler {
  constructor(private readonly repository: ExecutionPlanRepositoryPort) {}

  async execute(command: CreatePlanVersionCommand): Promise<PlanVersion> {
    const definition = await this.repository.findDefinitionById(
      command.tenantContext,
      command.planId,
    );
    if (!definition) {
      throw new Error(
        `[CreatePlanVersionCommandHandler] PlanDefinition '${command.planId}' not found.`,
      );
    }

    const graphId = `graph-${command.planId}-${command.newVersion}`;
    const graph = ExecutionGraph.create(graphId, command.nodes, command.edges);
    await this.repository.saveGraph(command.tenantContext, graph);

    const version = new PlanVersion({
      version: command.newVersion,
      graphId: graph.graphId,
      graphChecksum: graph.graphChecksum,
      defaultBudget: command.budget ?? PlanBudget.createDefault(),
      createdAt: new Date(),
    });

    const updatedDef = definition.addVersion(version);
    await this.repository.saveDefinition(command.tenantContext, updatedDef);
    return version;
  }
}

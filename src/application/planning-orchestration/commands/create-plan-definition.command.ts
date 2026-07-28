import { TenantContext } from '../../identity/tenant-context';
import { PlanDefinition } from '../domain/plan-definition';
import { PlanVersion } from '../domain/plan-version';
import { ExecutionGraph } from '../graph/execution-graph';
import { PlanNode } from '../graph/plan-node';
import { PlanEdge } from '../graph/plan-edge';
import { PlanBudget } from '../vo/plan-budget';
import type { ExecutionPlanRepositoryPort } from '../ports/execution-plan-repository-port';

export interface CreatePlanDefinitionCommand {
  readonly planId: string;
  readonly name: string;
  readonly description: string;
  readonly owner: string;
  readonly version: string;
  readonly nodes: ReadonlyArray<PlanNode>;
  readonly edges: ReadonlyArray<PlanEdge>;
  readonly budget?: PlanBudget | undefined;
  readonly tenantContext: TenantContext;
}

export class CreatePlanDefinitionCommandHandler {
  constructor(private readonly repository: ExecutionPlanRepositoryPort) {}

  async execute(command: CreatePlanDefinitionCommand): Promise<PlanDefinition> {
    const graphId = `graph-${command.planId}-${command.version}`;
    const graph = ExecutionGraph.create(graphId, command.nodes, command.edges);
    await this.repository.saveGraph(command.tenantContext, graph);

    const version = new PlanVersion({
      version: command.version,
      graphId: graph.graphId,
      graphChecksum: graph.graphChecksum,
      defaultBudget: command.budget ?? PlanBudget.createDefault(),
      createdAt: new Date(),
    });

    const definition = PlanDefinition.create({
      planId: command.planId,
      name: command.name,
      description: command.description,
      owner: command.owner,
      versions: [version],
      defaultVersion: command.version,
    });

    await this.repository.saveDefinition(command.tenantContext, definition);
    return definition;
  }
}

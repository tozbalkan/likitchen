import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { ExecutionScheduler } from '../engine/execution-scheduler';
import type { ExecutionPlanRepositoryPort } from '../ports/execution-plan-repository-port';

export interface StartPlanInstanceCommand {
  readonly instanceId: string;
  readonly tenantContext: TenantContext;
}

export class StartPlanInstanceCommandHandler {
  constructor(
    private readonly repository: ExecutionPlanRepositoryPort,
    private readonly scheduler: ExecutionScheduler,
  ) {}

  async execute(
    command: StartPlanInstanceCommand,
  ): Promise<ExecutionPlanInstance> {
    let instance = await this.repository.findInstanceById(
      command.tenantContext,
      command.instanceId,
    );
    if (!instance) {
      throw new Error(
        `[StartPlanInstanceCommandHandler] Instance '${command.instanceId}' not found.`,
      );
    }

    const graph = await this.repository.findGraphById(
      command.tenantContext,
      instance.graphId,
    );
    if (!graph) {
      throw new Error(
        `[StartPlanInstanceCommandHandler] Graph '${instance.graphId}' not found.`,
      );
    }

    instance = await this.scheduler.stepExecution(
      command.tenantContext,
      instance,
      graph,
    );
    await this.repository.saveInstance(command.tenantContext, instance);
    return instance;
  }
}

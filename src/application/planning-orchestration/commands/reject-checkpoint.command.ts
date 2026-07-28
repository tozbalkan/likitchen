import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { CheckpointManager } from '../services/checkpoint-manager';
import type { ExecutionPlanRepositoryPort } from '../ports/execution-plan-repository-port';

export interface RejectCheckpointCommand {
  readonly instanceId: string;
  readonly checkpointId: string;
  readonly approverId: string;
  readonly comments?: string | undefined;
  readonly tenantContext: TenantContext;
}

export class RejectCheckpointCommandHandler {
  constructor(
    private readonly repository: ExecutionPlanRepositoryPort,
    private readonly checkpointManager: CheckpointManager,
  ) {}

  async execute(
    command: RejectCheckpointCommand,
  ): Promise<ExecutionPlanInstance> {
    const instance = await this.repository.findInstanceById(
      command.tenantContext,
      command.instanceId,
    );
    if (!instance) {
      throw new Error(
        `[RejectCheckpointCommandHandler] Instance '${command.instanceId}' not found.`,
      );
    }

    const updated = this.checkpointManager.rejectCheckpoint(
      instance,
      command.checkpointId,
      command.approverId,
      command.comments,
    );

    await this.repository.saveInstance(command.tenantContext, updated);
    return updated;
  }
}

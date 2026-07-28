import { TenantContext } from '../../identity/tenant-context';
import { ExecutionPlanInstance } from '../domain/execution-plan-instance';
import { CheckpointManager } from '../services/checkpoint-manager';
import type { ExecutionPlanRepositoryPort } from '../ports/execution-plan-repository-port';

export interface ApproveCheckpointCommand {
  readonly instanceId: string;
  readonly checkpointId: string;
  readonly approverId: string;
  readonly comments?: string | undefined;
  readonly tenantContext: TenantContext;
}

export class ApproveCheckpointCommandHandler {
  constructor(
    private readonly repository: ExecutionPlanRepositoryPort,
    private readonly checkpointManager: CheckpointManager,
  ) {}

  async execute(
    command: ApproveCheckpointCommand,
  ): Promise<ExecutionPlanInstance> {
    const instance = await this.repository.findInstanceById(
      command.tenantContext,
      command.instanceId,
    );
    if (!instance) {
      throw new Error(
        `[ApproveCheckpointCommandHandler] Instance '${command.instanceId}' not found.`,
      );
    }

    const updated = this.checkpointManager.approveCheckpoint(
      instance,
      command.checkpointId,
      command.approverId,
      command.comments,
    );

    await this.repository.saveInstance(command.tenantContext, updated);
    return updated;
  }
}

import { ExecutionEnvelope } from '../../vo/execution-envelope';
import type { PermissionEvaluatorPort } from '../../../identity/auth/permission-evaluator-port';
import type { PipelineBehavior } from './validate-request.behavior';

export class AuthorizationBehavior implements PipelineBehavior {
  constructor(private readonly permissionEvaluator?: PermissionEvaluatorPort) {}

  async execute(
    envelope: Readonly<ExecutionEnvelope>,
  ): Promise<ExecutionEnvelope> {
    if (!envelope.context.tenantContext.tenantId) {
      throw new Error('[AuthorizationBehavior] Invalid tenant context.');
    }

    if (this.permissionEvaluator) {
      const isAllowed = await this.permissionEvaluator.hasPermission(
        envelope.context.tenantContext,
        'Tool.Execute',
      );
      if (!isAllowed) {
        throw new Error(
          `[AuthorizationBehavior] Tenant '${envelope.context.tenantContext.tenantId}' lacks permission 'Tool.Execute'.`,
        );
      }
    }
    return envelope;
  }
}

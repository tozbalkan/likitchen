import type { TenantContext } from '../tenant-context';
import type { PermissionEvaluatorPort } from './permission-evaluator-port';

export class UnauthorizedException extends Error {
  constructor(permission: string, tenantId: string) {
    super(
      `[UseCaseGuard] Permission '${permission}' denied for tenant '${tenantId}'`,
    );
    this.name = 'UnauthorizedException';
  }
}

export class UseCaseGuard {
  constructor(private readonly permissionEvaluator: PermissionEvaluatorPort) {}

  async authorize(
    context: Readonly<TenantContext>,
    requiredPermission: string,
  ): Promise<void> {
    const allowed = await this.permissionEvaluator.hasPermission(
      context,
      requiredPermission,
    );
    if (!allowed) {
      throw new UnauthorizedException(requiredPermission, context.tenantId);
    }
  }
}

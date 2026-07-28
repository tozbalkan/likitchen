import type { PermissionEvaluatorPort } from '../../application/identity/auth/permission-evaluator-port';
import type { TenantContext } from '../../application/identity/tenant-context';

export class MemoryPermissionEvaluatorAdapter implements PermissionEvaluatorPort {
  private readonly permissionsByRole = new Map<string, Set<string>>([
    [
      'ADMIN',
      new Set([
        'conversation.start',
        'conversation.complete',
        'conversation.reopen',
        'admin.all',
      ]),
    ],
    [
      'OPERATOR',
      new Set([
        'conversation.start',
        'conversation.complete',
        'conversation.reopen',
      ]),
    ],
    ['VIEWER', new Set(['conversation.view'])],
  ]);

  constructor(
    private readonly tenantRoleMapping: Readonly<Record<string, string>> = {},
  ) {}

  async hasPermission(
    context: Readonly<TenantContext>,
    permission: string,
  ): Promise<boolean> {
    const role = this.tenantRoleMapping[context.tenantId] ?? 'OPERATOR';
    const permissions = this.permissionsByRole.get(role);
    if (!permissions) return false;
    return permissions.has(permission) || permissions.has('admin.all');
  }
}

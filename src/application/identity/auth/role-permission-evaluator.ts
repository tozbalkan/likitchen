import type {
  PermissionEvaluatorPort,
  Role,
} from './permission-evaluator-port';
import type { TenantContext } from '../tenant-context';

export class RolePermissionEvaluator implements PermissionEvaluatorPort {
  private static readonly PERMISSIONS_BY_ROLE: ReadonlyMap<
    string,
    ReadonlySet<string>
  > = new Map([
    [
      'ADMIN',
      new Set([
        'conversation.start',
        'conversation.complete',
        'conversation.reopen',
        'dashboard.leads.read',
        'dashboard.leads.takeover',
        'admin.all',
      ]),
    ],
    [
      'OPERATOR',
      new Set([
        'conversation.start',
        'conversation.complete',
        'conversation.reopen',
        'dashboard.leads.read',
        'dashboard.leads.takeover',
      ]),
    ],
    ['AUDITOR', new Set(['conversation.view', 'dashboard.leads.read'])],
    ['VIEWER', new Set(['conversation.view', 'dashboard.leads.read'])],
  ]);

  constructor(private readonly role: Role | string) {}

  async hasPermission(
    _context: Readonly<TenantContext>,
    permission: string,
  ): Promise<boolean> {
    if (!this.role) return false;
    const permissions = RolePermissionEvaluator.PERMISSIONS_BY_ROLE.get(
      this.role,
    );
    if (!permissions) return false; // Unknown role fails closed!
    return permissions.has(permission) || permissions.has('admin.all');
  }
}

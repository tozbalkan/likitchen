import type { TenantContext } from '../tenant-context';

export enum Role {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
  AUDITOR = 'AUDITOR',
  VIEWER = 'VIEWER',
}

export interface PermissionEvaluatorPort {
  hasPermission(
    context: Readonly<TenantContext>,
    permission: string,
  ): Promise<boolean>;
}

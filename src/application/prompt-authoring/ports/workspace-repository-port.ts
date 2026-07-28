import { TenantContext } from '../../identity/tenant-context';
import { PromptWorkspace } from '../prompt-workspace';

export interface WorkspaceRepositoryPort {
  saveWorkspace(
    tenant: Readonly<TenantContext>,
    workspace: Readonly<PromptWorkspace>,
  ): Promise<void>;
  findWorkspaceById(
    tenant: Readonly<TenantContext>,
    workspaceId: string,
  ): Promise<PromptWorkspace | undefined>;
  findWorkspaceByPromptId(
    tenant: Readonly<TenantContext>,
    promptId: string,
  ): Promise<PromptWorkspace | undefined>;
  deleteWorkspace(
    tenant: Readonly<TenantContext>,
    workspaceId: string,
  ): Promise<void>;
}

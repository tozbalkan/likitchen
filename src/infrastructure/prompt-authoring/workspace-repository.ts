import type { WorkspaceRepositoryPort } from '../../application/prompt-authoring/ports/workspace-repository-port';
import { PromptWorkspace } from '../../application/prompt-authoring/prompt-workspace';
import { TenantContext } from '../../application/identity/tenant-context';

export class InMemoryWorkspaceRepositoryAdapter implements WorkspaceRepositoryPort {
  private readonly store = new Map<string, Map<string, PromptWorkspace>>();

  private getTenantStore(
    tenant: Readonly<TenantContext>,
  ): Map<string, PromptWorkspace> {
    const key = tenant.tenantId;
    if (!this.store.has(key)) {
      this.store.set(key, new Map());
    }
    return this.store.get(key)!;
  }

  async saveWorkspace(
    tenant: Readonly<TenantContext>,
    workspace: Readonly<PromptWorkspace>,
  ): Promise<void> {
    const tStore = this.getTenantStore(tenant);
    tStore.set(workspace.workspaceId, workspace as PromptWorkspace);
  }

  async findWorkspaceById(
    tenant: Readonly<TenantContext>,
    workspaceId: string,
  ): Promise<PromptWorkspace | undefined> {
    const tStore = this.getTenantStore(tenant);
    return tStore.get(workspaceId);
  }

  async findWorkspaceByPromptId(
    tenant: Readonly<TenantContext>,
    promptId: string,
  ): Promise<PromptWorkspace | undefined> {
    const tStore = this.getTenantStore(tenant);
    for (const ws of tStore.values()) {
      if (ws.promptId === promptId) {
        return ws;
      }
    }
    return undefined;
  }

  async deleteWorkspace(
    tenant: Readonly<TenantContext>,
    workspaceId: string,
  ): Promise<void> {
    const tStore = this.getTenantStore(tenant);
    tStore.delete(workspaceId);
  }
}

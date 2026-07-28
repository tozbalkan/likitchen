import { describe, it, expect } from 'vitest';
import { InMemoryWorkspaceRepositoryAdapter } from './workspace-repository';
import { PromptWorkspace } from '../../application/prompt-authoring/prompt-workspace';
import { PromptDocument } from '../../application/prompt/prompt-document';
import { TenantContext } from '../../application/identity/tenant-context';
import { CreateWorkspaceCommandHandler } from '../../application/prompt-authoring/commands/create-workspace.command';
import { UpdateDraftCommandHandler } from '../../application/prompt-authoring/commands/update-draft.command';
import { AcquireLeaseCommandHandler } from '../../application/prompt-authoring/commands/acquire-lease.command';
import { ReleaseLeaseCommandHandler } from '../../application/prompt-authoring/commands/release-lease.command';
import { GetWorkspaceQueryHandler } from '../../application/prompt-authoring/queries/get-workspace.query';
import { GetWorkspaceHistoryQueryHandler } from '../../application/prompt-authoring/queries/get-workspace-history.query';

describe('Phase 1A — Prompt Workspace Aggregate, Leasing & CQRS', () => {
  const repository = new InMemoryWorkspaceRepositoryAdapter();
  const createHandler = new CreateWorkspaceCommandHandler(repository);
  const updateHandler = new UpdateDraftCommandHandler(repository);
  const acquireLeaseHandler = new AcquireLeaseCommandHandler(repository);
  const releaseLeaseHandler = new ReleaseLeaseCommandHandler(repository);
  const getQueryHandler = new GetWorkspaceQueryHandler(repository);
  const getHistoryHandler = new GetWorkspaceHistoryQueryHandler(repository);

  const tenantA = TenantContext.create({
    tenantId: 'tenant-phase1a-a',
    organizationId: 'org-a',
    workspaceId: 'ws-a',
    environment: 'test',
    region: 'us-east-1',
  });

  const tenantB = TenantContext.create({
    tenantId: 'tenant-phase1a-b',
    organizationId: 'org-b',
    workspaceId: 'ws-b',
    environment: 'test',
    region: 'us-east-1',
  });

  it('creates workspace, manages lease locking, updates draft with snapshot timeline, and enforces tenant isolation', async () => {
    const doc = PromptDocument.create({
      id: 'doc-1a',
      systemTemplate: 'System {{role}}',
      userTemplate: 'User {{msg}}',
      variables: ['role', 'msg'],
    });

    // 1. Create Workspace via CQRS Command
    const workspace = await createHandler.execute({
      workspaceId: 'ws-1a-1',
      promptId: 'prompt-1a',
      tenantContext: tenantA,
      baseVersionId: 'v-1.0.0',
      baseVersionChecksum: 'checksum-1.0.0',
      draftDocument: doc,
      draftVariables: [],
      actor: 'alice',
    });

    expect(workspace.workspaceId).toBe('ws-1a-1');
    expect(workspace.snapshots).toHaveLength(1);

    // 2. Query Read Model
    const readModelA = await getQueryHandler.execute({
      workspaceId: 'ws-1a-1',
      tenantContext: tenantA,
    });
    expect(readModelA).toBeDefined();
    expect(readModelA?.leaseState).toBe('UNLOCKED');

    // Tenant B cannot access Tenant A workspace
    const readModelB = await getQueryHandler.execute({
      workspaceId: 'ws-1a-1',
      tenantContext: tenantB,
    });
    expect(readModelB).toBeUndefined();

    // 3. Acquire Lease
    const leased = await acquireLeaseHandler.execute({
      workspaceId: 'ws-1a-1',
      tenantContext: tenantA,
      ownerId: 'alice',
      ttlMs: 60000,
    });
    expect(leased.activeLease?.ownerId).toBe('alice');

    // Bob cannot update draft while locked by Alice
    const doc2 = PromptDocument.create({
      id: 'doc-1a-v2',
      systemTemplate: 'System {{role}} updated',
      userTemplate: 'User {{msg}} updated',
      variables: ['role', 'msg'],
    });

    await expect(
      updateHandler.execute({
        workspaceId: 'ws-1a-1',
        tenantContext: tenantA,
        newDocument: doc2,
        newVariables: [],
        actor: 'bob',
      }),
    ).rejects.toThrow("Workspace is locked by 'alice'");

    // Alice updates draft
    const updated = await updateHandler.execute({
      workspaceId: 'ws-1a-1',
      tenantContext: tenantA,
      newDocument: doc2,
      newVariables: [],
      actor: 'alice',
    });

    expect(updated.snapshots).toHaveLength(2);

    // Release Lease
    const released = await releaseLeaseHandler.execute({
      workspaceId: 'ws-1a-1',
      tenantContext: tenantA,
      ownerId: 'alice',
    });
    expect(released.activeLease).toBeUndefined();

    // History Read Model
    const history = await getHistoryHandler.execute({
      workspaceId: 'ws-1a-1',
      tenantContext: tenantA,
    });
    expect(history?.totalRevisions).toBe(2);
  });
});

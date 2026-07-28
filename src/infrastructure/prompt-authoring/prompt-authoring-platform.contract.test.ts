import { describe, it, expect } from 'vitest';
import { buildApplication } from '../../bootstrap/build-application';
import { TenantContext } from '../../application/identity/tenant-context';
import { PromptDocument } from '../../application/prompt/prompt-document';
import { PromptVariableDefinition } from '../../application/prompt-authoring/prompt-variable-definition';
import type { WorkspaceRepositoryPort } from '../../application/prompt-authoring/ports/workspace-repository-port';
import type { PromptRepositoryPort } from '../../application/prompt/ports/prompt-repository-port';
import type { PromptPublisherPort } from '../../application/prompt/ports/prompt-publisher-port';
import type { OutboxPort } from '../../application/prompt-authoring/ports/outbox-port';
import type { PreviewPipeline } from '../../application/prompt-authoring/preview-pipeline';
import { CreateWorkspaceCommandHandler } from '../../application/prompt-authoring/commands/create-workspace.command';
import { UpdateDraftCommandHandler } from '../../application/prompt-authoring/commands/update-draft.command';
import { AcquireLeaseCommandHandler } from '../../application/prompt-authoring/commands/acquire-lease.command';
import { RequestReviewCommandHandler } from '../../application/prompt-authoring/commands/request-review.command';
import { ApproveReviewCommandHandler } from '../../application/prompt-authoring/commands/approve-review.command';
import { PublishApprovedPromptCommandHandler } from '../../application/prompt-authoring/commands/publish-approved-prompt.command';
import { GetWorkspaceQueryHandler } from '../../application/prompt-authoring/queries/get-workspace.query';
import { PreviewContext } from '../../application/prompt-authoring/preview-context';
import { PromptDefinition } from '../../application/prompt/prompt-definition';

describe('Capability-022 Prompt Studio Authoring Platform Contract Tests', () => {
  it('assembles application, executes full CQRS authoring lifecycle, preview pipeline, review workflow, and prompt publication with zero breaking changes', async () => {
    const registry = await buildApplication();

    const wsRepo = registry.resolve<WorkspaceRepositoryPort>(
      'WorkspaceRepositoryPort',
    );
    const promptRepo = registry.resolve<PromptRepositoryPort>(
      'PromptRepositoryPort',
    );
    const publisher = registry.resolve<PromptPublisherPort>(
      'PromptPublisherPort',
    );
    const outbox = registry.resolve<OutboxPort>('OutboxPort');
    const previewPipeline =
      registry.resolve<PreviewPipeline>('PreviewPipeline');

    const tenant = TenantContext.create({
      tenantId: 'tenant-authoring-contract',
      organizationId: 'org-contract',
      workspaceId: 'ws-contract',
      environment: 'production',
      region: 'eu-central-1',
    });

    // 1. Create Base Definition in Prompt Repository (Capability-021)
    const def = PromptDefinition.create({
      id: 'p-authoring-1',
      namespace: 'finance',
      name: 'invoice-assistant',
      description: 'Invoice processing assistant',
      currentVersionId: 'v-0.1.0',
      tags: ['finance'],
      owner: 'finance-team',
      createdAt: new Date(),
    });
    await promptRepo.saveDefinition(tenant, def);

    // 2. Command: Create Workspace
    const createHandler = new CreateWorkspaceCommandHandler(wsRepo);
    const doc1 = PromptDocument.create({
      id: 'doc-authoring-v1',
      systemTemplate: 'You are {{role}} specializing in {{domain}}.',
      userTemplate: 'Process invoice for {{client}} with secret {{apiKey}}.',
      variables: ['role', 'domain', 'client', 'apiKey'],
    });

    const vars = [
      PromptVariableDefinition.create({
        name: 'role',
        type: 'string',
        required: true,
        secret: false,
        source: 'STATIC',
      }),
      PromptVariableDefinition.create({
        name: 'domain',
        type: 'string',
        required: true,
        secret: false,
        source: 'STATIC',
      }),
      PromptVariableDefinition.create({
        name: 'client',
        type: 'string',
        required: true,
        secret: false,
        source: 'USER',
      }),
      PromptVariableDefinition.create({
        name: 'apiKey',
        type: 'string',
        required: true,
        secret: true,
        source: 'SECRET',
      }),
    ];

    await createHandler.execute({
      workspaceId: 'ws-inv-1',
      promptId: 'p-authoring-1',
      tenantContext: tenant,
      baseVersionId: 'v-0.1.0',
      baseVersionChecksum: 'checksum-0.1.0',
      draftDocument: doc1,
      draftVariables: vars,
      actor: 'alice',
    });

    // 3. Command: Acquire Lease
    const leaseHandler = new AcquireLeaseCommandHandler(wsRepo);
    await leaseHandler.execute({
      workspaceId: 'ws-inv-1',
      tenantContext: tenant,
      ownerId: 'alice',
      ttlMs: 60000,
    });

    // 4. Command: Update Draft
    const updateHandler = new UpdateDraftCommandHandler(wsRepo);
    const doc2 = PromptDocument.create({
      id: 'doc-authoring-v2',
      systemTemplate:
        'You are {{role}} specializing in {{domain}}.\nAlways check invoice total.',
      userTemplate: 'Process invoice for {{client}} with secret {{apiKey}}.',
      variables: ['role', 'domain', 'client', 'apiKey'],
    });

    await updateHandler.execute({
      workspaceId: 'ws-inv-1',
      tenantContext: tenant,
      newDocument: doc2,
      newVariables: vars,
      actor: 'alice',
    });

    // 5. Preview Pipeline Execution with Secret Masking
    const previewCtx = PreviewContext.create({
      document: doc2,
      variables: vars,
      sampleVariableValues: {
        role: 'Invoice Auditor',
        domain: 'Accounting',
        client: 'Acme Corp',
        apiKey: 'secret-token-999',
      },
      modelAlias: 'gpt-4o',
    });

    const previewResult = await previewPipeline.execute(previewCtx);
    expect(previewResult.isValid).toBe(true);
    expect(previewResult.renderedSystemPrompt).toContain('Invoice Auditor');
    expect(previewResult.maskedSampleValues?.['apiKey']).toBe(
      '***MASKED_SECRET***',
    );
    expect(
      previewResult.tokenCostEstimate?.estimatedTotalTokens,
    ).toBeGreaterThan(0);

    // 6. Query Read Model
    const getQueryHandler = new GetWorkspaceQueryHandler(wsRepo);
    const readModel = await getQueryHandler.execute({
      workspaceId: 'ws-inv-1',
      tenantContext: tenant,
    });
    expect(readModel?.revisionCount).toBe(2);
    expect(readModel?.leaseState).toBe('LOCKED');

    // 7. Review Workflow Commands (Request -> Approve)
    const requestReviewHandler = new RequestReviewCommandHandler(
      wsRepo,
      outbox,
    );
    const approveReviewHandler = new ApproveReviewCommandHandler(
      wsRepo,
      outbox,
    );

    await requestReviewHandler.execute({
      workspaceId: 'ws-inv-1',
      tenantContext: tenant,
      actor: 'alice',
    });

    await approveReviewHandler.execute({
      workspaceId: 'ws-inv-1',
      tenantContext: tenant,
      actor: 'carol-lead',
    });

    // 8. Command: Publish Approved Prompt
    const publishHandler = new PublishApprovedPromptCommandHandler(
      wsRepo,
      promptRepo,
      publisher,
      outbox,
    );

    const publishedVersion = await publishHandler.execute({
      workspaceId: 'ws-inv-1',
      tenantContext: tenant,
      newVersionNumber: '1.0.0',
      actor: 'alice',
    });

    expect(publishedVersion.status).toBe('PUBLISHED');
    expect(publishedVersion.version).toBe('1.0.0');

    // Workspace is now ARCHIVED
    const archivedModel = await getQueryHandler.execute({
      workspaceId: 'ws-inv-1',
      tenantContext: tenant,
    });
    expect(archivedModel?.lifecycle).toBe('ARCHIVED');

    // Outbox events recorded
    const events = await outbox.getPendingEvents();
    expect(events.length).toBeGreaterThanOrEqual(3);
  });
});

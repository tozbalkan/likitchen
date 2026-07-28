import { describe, it, expect } from 'vitest';
import { InMemoryWorkspaceRepositoryAdapter } from './workspace-repository';
import { InMemoryPromptRepositoryAdapter } from '../prompt/in-memory-prompt-repository';
import { PromptValidatorService } from '../../application/prompt/prompt-validator';
import { PromptPublisherService } from '../../application/prompt/prompt-publisher';
import { MemoryOutboxAdapter } from './memory-outbox-adapter';
import { TenantContext } from '../../application/identity/tenant-context';
import { PromptDocument } from '../../application/prompt/prompt-document';
import { CreateWorkspaceCommandHandler } from '../../application/prompt-authoring/commands/create-workspace.command';
import { RequestReviewCommandHandler } from '../../application/prompt-authoring/commands/request-review.command';
import { ApproveReviewCommandHandler } from '../../application/prompt-authoring/commands/approve-review.command';
import { PublishApprovedPromptCommandHandler } from '../../application/prompt-authoring/commands/publish-approved-prompt.command';
import { ReviewPipelineDefinition } from '../../application/prompt-authoring/review-pipeline-definition';
import { ReviewStateMachine } from '../../application/prompt-authoring/review-state-machine';

describe('Phase 2 — Review Workflow, Decoupled State Machine & Publishing Command', () => {
  const wsRepo = new InMemoryWorkspaceRepositoryAdapter();
  const promptRepo = new InMemoryPromptRepositoryAdapter();
  const validator = new PromptValidatorService();
  const publisher = new PromptPublisherService(promptRepo, validator);
  const outbox = new MemoryOutboxAdapter();

  const createHandler = new CreateWorkspaceCommandHandler(wsRepo);
  const requestHandler = new RequestReviewCommandHandler(wsRepo, outbox);
  const approveHandler = new ApproveReviewCommandHandler(wsRepo, outbox);
  const publishHandler = new PublishApprovedPromptCommandHandler(
    wsRepo,
    promptRepo,
    publisher,
    outbox,
  );

  const pipelineDef = ReviewPipelineDefinition.createDefault();
  const stateMachine = new ReviewStateMachine(pipelineDef);

  const tenant = TenantContext.create({
    tenantId: 'tenant-phase2',
    organizationId: 'org-p2',
    workspaceId: 'ws-p2',
    environment: 'test',
    region: 'us-east-1',
  });

  it('progresses through ReviewStateMachine ACTIVE -> IN_REVIEW -> APPROVED -> PUBLISHED, recording outbox events', async () => {
    const doc = PromptDocument.create({
      id: 'doc-p2',
      systemTemplate: 'System {{role}}',
      userTemplate: 'User {{msg}}',
      variables: ['role', 'msg'],
    });

    // 1. Create Workspace
    const ws = await createHandler.execute({
      workspaceId: 'ws-p2-1',
      promptId: 'prompt-p2',
      tenantContext: tenant,
      baseVersionId: 'v-0.0.0',
      baseVersionChecksum: 'checksum-0.0.0',
      draftDocument: doc,
      draftVariables: [],
      actor: 'alice',
    });

    expect(ws.lifecycle).toBe('ACTIVE');
    expect(stateMachine.canTransitionToInReview(ws)).toBe(true);

    // 2. Request Review
    const inReview = await requestHandler.execute({
      workspaceId: 'ws-p2-1',
      tenantContext: tenant,
      actor: 'alice',
    });
    expect(inReview.lifecycle).toBe('IN_REVIEW');

    // 3. Approve Review
    const approved = await approveHandler.execute({
      workspaceId: 'ws-p2-1',
      tenantContext: tenant,
      actor: 'bob-reviewer',
    });
    expect(approved.lifecycle).toBe('APPROVED');

    // 4. Publish Approved Prompt via CQRS Command
    const publishedVersion = await publishHandler.execute({
      workspaceId: 'ws-p2-1',
      tenantContext: tenant,
      newVersionNumber: '1.0.0',
      actor: 'alice',
    });

    expect(publishedVersion.status).toBe('PUBLISHED');
    expect(publishedVersion.version).toBe('1.0.0');

    // 5. Verify Outbox Events Recorded
    const pendingEvents = await outbox.getPendingEvents();
    expect(pendingEvents).toHaveLength(3); // ReviewRequested, ReviewApproved, PromptPublished
    expect(pendingEvents.map((e) => e.eventType)).toEqual([
      'ReviewRequested',
      'ReviewApproved',
      'PromptPublished',
    ]);
  });
});

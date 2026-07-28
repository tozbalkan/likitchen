import { describe, it, expect } from 'vitest';
import { PromptDocument } from '../../application/prompt/prompt-document';
import { ThreeWayMergeStrategy } from '../../application/prompt-authoring/three-way-merge-service';
import { MergeStrategyResolver } from '../../application/prompt-authoring/merge-strategy-resolver';
import { MergeContext } from '../../application/prompt-authoring/prompt-merge-result';
import { PromptDiffService } from '../../application/prompt-authoring/prompt-diff-service';
import { TenantContext } from '../../application/identity/tenant-context';

describe('Phase 1B — MergeStrategy, Resolver, DiffService & DiffClassifier', () => {
  const tenant = TenantContext.create({
    tenantId: 'tenant-phase1b',
    organizationId: 'org-1b',
    workspaceId: 'ws-1b',
    environment: 'test',
    region: 'us-east-1',
  });

  const mergeService = new ThreeWayMergeStrategy();
  const resolver = new MergeStrategyResolver();
  const diffService = new PromptDiffService();

  const baseDoc = PromptDocument.create({
    id: 'doc-base',
    systemTemplate: 'You are {{role}} serving {{customer}}.',
    userTemplate: 'Help with {{topic}}.',
    variables: ['role', 'customer', 'topic'],
  });

  it('performs three-way merge cleanly when non-overlapping changes occur', async () => {
    const currentDoc = PromptDocument.create({
      id: 'doc-cur',
      systemTemplate: 'You are {{role}} serving {{customer}} gracefully.',
      userTemplate: 'Help with {{topic}}.',
      variables: ['role', 'customer', 'topic'],
    });

    const incomingDoc = PromptDocument.create({
      id: 'doc-inc',
      systemTemplate: 'You are {{role}} serving {{customer}}.',
      userTemplate: 'Help urgently with {{topic}}.',
      variables: ['role', 'customer', 'topic', 'urgency'],
    });

    const context = MergeContext.create({
      baseVersionChecksum: baseDoc.documentChecksum,
      mergeReason: 'PublishConflict',
      tenantContext: tenant,
    });

    const resolvedStrategy = resolver.resolveStrategy(context);
    expect(resolvedStrategy.name).toBe('ThreeWayMergeStrategy');

    const mergeResult = await resolvedStrategy.merge(
      baseDoc,
      currentDoc,
      incomingDoc,
      context,
    );
    expect(mergeResult.isSuccessful).toBe(true);
    expect(mergeResult.mergedDocument?.systemTemplate).toBe(
      'You are {{role}} serving {{customer}} gracefully.',
    );
    expect(mergeResult.mergedDocument?.userTemplate).toBe(
      'Help urgently with {{topic}}.',
    );
    expect(mergeResult.mergedDocument?.variables).toContain('urgency');
  });

  it('detects line diffs and classifies variable removals as BREAKING with confidence score', () => {
    const modifiedDoc = PromptDocument.create({
      id: 'doc-mod',
      systemTemplate: 'You are {{role}} serving {{customer}} updated.',
      userTemplate: 'Help with text.',
      variables: ['role', 'customer'], // 'topic' removed!
    });

    const diff = diffService.computeDiff(baseDoc, modifiedDoc);
    expect(diff.removedVariables).toContain('topic');
    expect(diff.classification.category).toBe('BREAKING');
    expect(diff.classification.requiresHumanReview).toBe(true);
    expect(diff.classification.confidence).toBeGreaterThan(0.9);
  });
});

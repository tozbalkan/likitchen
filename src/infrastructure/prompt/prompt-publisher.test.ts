import { describe, it, expect } from 'vitest';
import { PromptDocument } from '../../application/prompt/prompt-document';
import { PromptVersion } from '../../application/prompt/prompt-version';
import {
  PromptPublisherService,
  InvalidStatusTransitionException,
} from '../../application/prompt/prompt-publisher';
import { PromptValidatorService } from '../../application/prompt/prompt-validator';
import { InMemoryPromptRepositoryAdapter } from './in-memory-prompt-repository';
import { TenantContext } from '../../application/identity/tenant-context';

describe('PromptPublisherService', () => {
  const repository = new InMemoryPromptRepositoryAdapter();
  const validator = new PromptValidatorService();
  const publisher = new PromptPublisherService(repository, validator);

  const tenant = TenantContext.create({
    tenantId: 't-pub',
    organizationId: 'o-pub',
    workspaceId: 'w-pub',
    environment: 'test',
    region: 'us-east-1',
  });

  it('enforces state machine transition DRAFT -> PUBLISHED -> DEPRECATED -> ARCHIVED', async () => {
    const doc = PromptDocument.create({
      id: 'doc-pub',
      systemTemplate: 'System {{role}}',
      userTemplate: 'User {{msg}}',
      variables: ['role', 'msg'],
    });

    const draft = PromptVersion.create({
      id: 'v-pub-1',
      promptId: 'p-pub-1',
      version: '1.0.0',
      document: doc,
      status: 'DRAFT',
      createdAt: new Date(),
    });

    await repository.saveVersion(tenant, draft, doc);

    // 1. Publish
    const published = await publisher.publish(tenant, 'v-pub-1');
    expect(published.status).toBe('PUBLISHED');

    // Cannot publish again or jump to invalid state
    await expect(publisher.archive(tenant, 'v-pub-1')).rejects.toThrow(
      InvalidStatusTransitionException,
    );

    // 2. Deprecate
    const deprecated = await publisher.deprecate(tenant, 'v-pub-1');
    expect(deprecated.status).toBe('DEPRECATED');

    // 3. Archive
    const archived = await publisher.archive(tenant, 'v-pub-1');
    expect(archived.status).toBe('ARCHIVED');
  });
});

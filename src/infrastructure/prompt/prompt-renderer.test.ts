import { describe, it, expect } from 'vitest';
import { PromptDocument } from '../../application/prompt/prompt-document';
import { PromptVersion } from '../../application/prompt/prompt-version';
import { PromptRendererService } from '../../application/prompt/prompt-renderer';
import { MustachePromptRendererEngineAdapter } from './mustache-prompt-renderer-engine';
import { MemoryRenderedPromptCacheAdapter } from './memory-rendered-prompt-cache';

describe('PromptRendererService', () => {
  const engine = new MustachePromptRendererEngineAdapter();
  const cache = new MemoryRenderedPromptCacheAdapter();
  const renderer = new PromptRendererService(engine, cache);

  it('substitutes template variables and generates deterministic hashes', async () => {
    const doc = PromptDocument.create({
      id: 'doc-1',
      systemTemplate: 'You are {{role}} serving {{customer}}.',
      userTemplate: 'Please assist with {{topic}}.',
      variables: ['role', 'customer', 'topic'],
    });

    const version = PromptVersion.create({
      id: 'v1',
      promptId: 'prompt-customer',
      version: '1.0.0',
      document: doc,
      status: 'PUBLISHED',
      createdAt: new Date(),
    });

    const result = await renderer.render(
      version,
      { role: 'Support AI', customer: 'Acme Corp', topic: 'billing' },
      'production',
      'core/customer:v1.0.0',
    );

    expect(result.systemPrompt).toBe('You are Support AI serving Acme Corp.');
    expect(result.userMessage).toBe('Please assist with billing.');
    expect(result.versionChecksum).toBe(version.versionChecksum);
    expect(result.renderHash).toBeDefined();
  });

  it('returns cached rendered prompt on subsequent calls with identical inputs', async () => {
    const doc = PromptDocument.create({
      id: 'doc-2',
      systemTemplate: 'Hello {{name}}',
      userTemplate: 'Question {{id}}',
      variables: ['name', 'id'],
    });

    const version = PromptVersion.create({
      id: 'v2',
      promptId: 'p2',
      version: '1.0.0',
      document: doc,
      createdAt: new Date(),
    });

    const r1 = await renderer.render(
      version,
      { name: 'Alice', id: 1 },
      'production',
      'core/test:v1',
    );
    const r2 = await renderer.render(
      version,
      { name: 'Alice', id: 1 },
      'production',
      'core/test:v1',
    );

    expect(r1.renderHash).toBe(r2.renderHash);
  });
});

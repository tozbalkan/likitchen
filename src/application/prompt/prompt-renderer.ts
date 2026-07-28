import { createHash } from 'node:crypto';
import type { PromptRendererPort } from './ports/prompt-renderer-port';
import type { PromptRendererEnginePort } from './ports/prompt-renderer-engine-port';
import type { RenderedPromptCachePort } from './ports/rendered-prompt-cache-port';
import type { PromptVersion } from './prompt-version';
import { RenderedPrompt } from './rendered-prompt';

export class PromptRendererService implements PromptRendererPort {
  constructor(
    private readonly engine: PromptRendererEnginePort,
    private readonly cache?: RenderedPromptCachePort,
  ) {}

  async render(
    version: Readonly<PromptVersion>,
    variables: Readonly<Record<string, unknown>>,
    environment: string,
    resolvedReference: string,
    resolvedAlias?: string,
    experimentId?: string,
  ): Promise<RenderedPrompt> {
    const doc = version.document;

    const renderVariablesHash = createHash('sha256')
      .update(JSON.stringify(variables))
      .digest('hex');

    // Check cache
    if (this.cache) {
      const cacheKey = this.cache.buildCacheKey({
        tenantId: environment,
        promptVersion: version.version,
        documentChecksum: doc.documentChecksum,
        renderVariablesHash,
        rendererEngineVersion: this.engine.version,
      });

      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const systemPrompt = this.engine.renderTemplate(
      doc.systemTemplate,
      variables,
    );
    const userMessage = this.engine.renderTemplate(doc.userTemplate, variables);

    const rendered = new RenderedPrompt({
      systemPrompt,
      userMessage,
      promptId: version.promptId,
      version: version.version,
      versionChecksum: version.versionChecksum,
      variablesUsed: variables,
      environment,
      experimentId,
      resolvedReference,
      resolvedAlias,
      rendererEngineVersion: this.engine.version,
    });

    if (this.cache) {
      const cacheKey = this.cache.buildCacheKey({
        tenantId: environment,
        promptVersion: version.version,
        documentChecksum: doc.documentChecksum,
        renderVariablesHash,
        rendererEngineVersion: this.engine.version,
      });
      await this.cache.set(cacheKey, rendered);
    }

    return rendered;
  }
}

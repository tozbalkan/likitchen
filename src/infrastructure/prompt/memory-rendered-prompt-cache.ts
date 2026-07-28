import type {
  RenderedPromptCachePort,
  RenderedPromptCacheKeyProps,
} from '../../application/prompt/ports/rendered-prompt-cache-port';
import type { RenderedPrompt } from '../../application/prompt/rendered-prompt';

export class MemoryRenderedPromptCacheAdapter implements RenderedPromptCachePort {
  private readonly cache = new Map<string, RenderedPrompt>();

  buildCacheKey(props: Readonly<RenderedPromptCacheKeyProps>): string {
    // Formula: ${tenantId}:${promptVersion}:${documentChecksum}:${renderVariablesHash}:${rendererEngineVersion}
    return `${props.tenantId}:${props.promptVersion}:${props.documentChecksum}:${props.renderVariablesHash}:${props.rendererEngineVersion}`;
  }

  async get(cacheKey: string): Promise<RenderedPrompt | undefined> {
    return this.cache.get(cacheKey);
  }

  async set(cacheKey: string, prompt: Readonly<RenderedPrompt>): Promise<void> {
    this.cache.set(cacheKey, prompt as RenderedPrompt);
  }

  clear(): void {
    this.cache.clear();
  }
}

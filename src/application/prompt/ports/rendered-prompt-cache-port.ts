import type { RenderedPrompt } from '../rendered-prompt';

export interface RenderedPromptCacheKeyProps {
  readonly tenantId: string;
  readonly promptVersion: string;
  readonly documentChecksum: string;
  readonly renderVariablesHash: string;
  readonly rendererEngineVersion: string;
}

export interface RenderedPromptCachePort {
  get(cacheKey: string): Promise<RenderedPrompt | undefined>;
  set(cacheKey: string, prompt: Readonly<RenderedPrompt>): Promise<void>;
  buildCacheKey(props: Readonly<RenderedPromptCacheKeyProps>): string;
}

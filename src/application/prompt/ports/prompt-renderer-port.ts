import type { RenderedPrompt } from '../rendered-prompt';
import type { PromptVersion } from '../prompt-version';

export interface PromptRendererPort {
  render(
    version: Readonly<PromptVersion>,
    variables: Readonly<Record<string, unknown>>,
    environment: string,
    resolvedReference: string,
    resolvedAlias?: string,
    experimentId?: string,
  ): Promise<RenderedPrompt>;
}

import type { ResolutionContext } from '../resolution-context';
import type { PromptRendererPort } from '../ports/prompt-renderer-port';

export class VersionResolver {
  constructor(private readonly rendererPort: PromptRendererPort) {}

  async resolveAndRender(
    context: Readonly<ResolutionContext>,
  ): Promise<ResolutionContext> {
    if (!context.resolvedVersion) {
      throw new Error(
        `[VersionResolver] Cannot render context without a resolved version.`,
      );
    }

    const renderedPrompt = await this.rendererPort.render(
      context.resolvedVersion,
      context.variables,
      context.environment,
      context.reference.fullReference,
      typeof context.reference.targetAlias === 'string'
        ? context.reference.targetAlias
        : context.reference.targetAlias
          ? String(context.reference.targetAlias)
          : undefined,
      context.experimentId,
    );

    return context.withRenderedPrompt(renderedPrompt);
  }
}

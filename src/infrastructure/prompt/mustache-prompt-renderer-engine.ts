import type { PromptRendererEnginePort } from '../../application/prompt/ports/prompt-renderer-engine-port';

export class MustachePromptRendererEngineAdapter implements PromptRendererEnginePort {
  readonly version = 'mustache-v1.0';

  renderTemplate(
    template: string,
    variables: Readonly<Record<string, unknown>>,
  ): string {
    if (!template) return '';

    return template.replace(
      /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
      (match, key: string) => {
        if (Object.prototype.hasOwnProperty.call(variables, key)) {
          const val = variables[key];
          return typeof val === 'object' ? JSON.stringify(val) : String(val);
        }
        return match;
      },
    );
  }
}

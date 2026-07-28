export interface PromptRendererEnginePort {
  readonly version: string;
  renderTemplate(
    template: string,
    variables: Readonly<Record<string, unknown>>,
  ): string;
}

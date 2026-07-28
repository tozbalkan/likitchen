export interface PromptResolutionResult {
  readonly systemPrompt: string;
  readonly userMessage: string;
  readonly resolvedPromptReference: string;
}

export interface PromptResolverPort {
  resolvePrompt(
    systemPromptReference: string,
    variables: Readonly<Record<string, unknown>>,
  ): Promise<PromptResolutionResult>;
}

export interface PromptExecutionMetadata {
  readonly promptVersion: number;
  readonly schemaVersion: number;
  readonly evaluationEngineVersion: number;
  readonly promptFingerprint: string;
  readonly datasetVersion?: string;
}

export interface PromptPackage {
  readonly systemPrompt: string;
  readonly userPrompt: string;
  readonly metadata: PromptExecutionMetadata;
}

export interface PromptBuilder {
  build(
    conversationHistory: readonly unknown[],
    newMessage: string,
  ): PromptPackage;
}

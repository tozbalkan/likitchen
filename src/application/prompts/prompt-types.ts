export interface PromptDefinition {
  readonly id: string;
  readonly template: string;
  readonly schemaVersion: number;
}

export type PromptVersion = string;

export type PromptFingerprint = string;

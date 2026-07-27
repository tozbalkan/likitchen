import type { PromptDefinition } from './prompt-types';

export interface PromptRepositoryPort {
  getPrompt(promptId: string): Promise<PromptDefinition | null>;
}

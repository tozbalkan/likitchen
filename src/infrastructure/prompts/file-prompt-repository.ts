import type { PromptRepositoryPort } from '../../application/prompts/prompt-repository-port';
import type { PromptDefinition } from '../../application/prompts/prompt-types';

export class FilePromptRepository implements PromptRepositoryPort {
  private readonly prompts = new Map<string, PromptDefinition>();

  constructor(initialPrompts?: readonly PromptDefinition[]) {
    if (initialPrompts) {
      for (const prompt of initialPrompts) {
        this.prompts.set(prompt.id, prompt);
      }
    }
  }

  async getPrompt(promptId: string): Promise<PromptDefinition | null> {
    return this.prompts.get(promptId) ?? null;
  }

  registerPrompt(prompt: Readonly<PromptDefinition>): void {
    this.prompts.set(prompt.id, prompt);
  }
}

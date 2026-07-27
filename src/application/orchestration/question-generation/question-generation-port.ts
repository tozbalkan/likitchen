import type { FactKey } from '../../../domain/conversation/policy/completion/completion-requirements';
import type { ConversationMemory } from '../memory/conversation-memory';

export interface QuestionPromptContext {
  readonly factKey: FactKey;
  readonly memory?: Readonly<ConversationMemory>;
}

export interface QuestionGenerationPort {
  generateQuestion(context: Readonly<QuestionPromptContext>): Promise<string>;
}

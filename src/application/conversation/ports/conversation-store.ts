import type { Result } from '../../../shared/result';
import type { Uuid } from '../../../shared/types';
import type { NotFoundError, ConflictFailure } from '../../../shared/errors';
import type { Conversation } from '../../../domain/conversation';

export interface ConversationStore {
  save(
    conversation: Conversation,
    expectedRevision: number,
  ): Promise<Result<void, ConflictFailure>>;
  findById(id: Uuid): Promise<Result<Conversation, NotFoundError>>;
}

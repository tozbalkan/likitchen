import type { ProcessContext } from '../../../shared/types';
import type { ConversationStore } from './conversation-store';
import type { IdempotencyStore } from './idempotency-store';

export interface ConversationUnitOfWork {
  /**
   * Executes the given action within a transactional boundary.
   * Provides the stores that are enlisted in the transaction.
   */
  execute<T>(
    context: Readonly<ProcessContext>,
    action: (stores: {
      conversation: ConversationStore;
      idempotency: IdempotencyStore;
    }) => Promise<T>,
  ): Promise<T>;
}

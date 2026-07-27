import type { IdempotencyKey } from '../../../shared/types';

export interface IdempotencyStore {
  /**
   * Checks if the given idempotency key has already been processed.
   */
  isProcessed(key: IdempotencyKey): Promise<boolean>;

  /**
   * Marks the given idempotency key as processed.
   * This should typically be called within a transaction alongside business state mutations.
   */
  markProcessed(key: IdempotencyKey): Promise<void>;
}

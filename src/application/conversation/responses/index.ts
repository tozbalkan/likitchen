import type { ReadonlyDeep } from 'type-fest';
import type { Uuid } from '../../../shared/types';

export type StartConversationResponse = ReadonlyDeep<{
  conversationId: Uuid;
  idempotent: boolean;
  revision: number;
}>;

export type ContinueConversationResponse = ReadonlyDeep<{
  conversationId: Uuid;
  idempotent: boolean;
  revision: number;
}>;

export type CompleteConversationResponse = ReadonlyDeep<{
  conversationId: Uuid;
  idempotent: boolean;
  revision: number;
}>;

export type ReopenConversationResponse = ReadonlyDeep<{
  conversationId: Uuid;
  idempotent: boolean;
  revision: number;
}>;

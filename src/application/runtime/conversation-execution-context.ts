import type {
  RuntimeState,
  ConversationRevision,
} from '../../domain/conversation/runtime/types';

export interface ConversationExecutionContext {
  readonly sessionId: string;
  readonly conversationId: string;
  readonly state: RuntimeState;
  readonly revision: ConversationRevision;
  readonly lockedUntil?: Date;
}

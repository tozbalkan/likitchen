export enum RuntimeState {
  WaitingForUser = 'WaitingForUser',
  Processing = 'Processing',
  WaitingForLLM = 'WaitingForLLM',
  WaitingForHuman = 'WaitingForHuman',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Expired = 'Expired',
}

export type RuntimeEventType =
  | 'UserMessageReceived'
  | 'DuplicateMessageDetected'
  | 'ProcessingCompleted'
  | 'LLMTimeoutOccurred'
  | 'HumanHandoffRequested'
  | 'AgentClosedHandoff'
  | 'SessionTimeoutOccurred';

export interface UserMessageReceivedEvent {
  readonly type: 'UserMessageReceived';
  readonly messageId: string;
  readonly revisionNumber: number;
}

export interface DuplicateMessageDetectedEvent {
  readonly type: 'DuplicateMessageDetected';
  readonly messageId: string;
}

export interface ProcessingCompletedEvent {
  readonly type: 'ProcessingCompleted';
}

export interface LLMTimeoutOccurredEvent {
  readonly type: 'LLMTimeoutOccurred';
}

export interface HumanHandoffRequestedEvent {
  readonly type: 'HumanHandoffRequested';
}

export interface AgentClosedHandoffEvent {
  readonly type: 'AgentClosedHandoff';
}

export interface SessionTimeoutOccurredEvent {
  readonly type: 'SessionTimeoutOccurred';
}

export type RuntimeEvent =
  | UserMessageReceivedEvent
  | DuplicateMessageDetectedEvent
  | ProcessingCompletedEvent
  | LLMTimeoutOccurredEvent
  | HumanHandoffRequestedEvent
  | AgentClosedHandoffEvent
  | SessionTimeoutOccurredEvent;

export interface ConversationRevision {
  readonly revisionNumber: number;
  readonly messageId: string;
}

export interface RuntimeEvaluation {
  readonly canProcess: boolean;
  readonly isDuplicate: boolean;
  readonly isStale: boolean;
  readonly isExpired: boolean;
  readonly isResumed: boolean;
  readonly nextState: RuntimeState;
  readonly reason: string;
}

import {
  RuntimeState,
  type RuntimeEvent,
  type ConversationRevision,
  type RuntimeEvaluation,
} from './types';

export class RuntimeEngine {
  evaluate(
    currentState: RuntimeState,
    currentRevision: Readonly<ConversationRevision> | undefined,
    event: Readonly<RuntimeEvent>,
  ): RuntimeEvaluation {
    switch (event.type) {
      case 'UserMessageReceived': {
        // Duplicate check
        if (currentRevision && currentRevision.messageId === event.messageId) {
          return {
            canProcess: false,
            isDuplicate: true,
            isStale: false,
            isExpired: false,
            isResumed: false,
            nextState: currentState,
            reason: 'Duplicate message ID detected.',
          };
        }

        // Stale revision check (incoming revision lower than active)
        if (
          currentRevision &&
          event.revisionNumber < currentRevision.revisionNumber
        ) {
          return {
            canProcess: false,
            isDuplicate: false,
            isStale: true,
            isExpired: false,
            isResumed: false,
            nextState: currentState,
            reason: 'Stale message revision detected.',
          };
        }

        // Resume from Expired or WaitingForHuman
        const isResumed =
          currentState === RuntimeState.Expired ||
          currentState === RuntimeState.WaitingForHuman;

        if (
          currentState === RuntimeState.Completed ||
          currentState === RuntimeState.Cancelled
        ) {
          return {
            canProcess: false,
            isDuplicate: false,
            isStale: false,
            isExpired: false,
            isResumed: false,
            nextState: currentState,
            reason: `Cannot process message in ${currentState} state.`,
          };
        }

        return {
          canProcess: true,
          isDuplicate: false,
          isStale: false,
          isExpired: false,
          isResumed,
          nextState: RuntimeState.Processing,
          reason: isResumed
            ? 'Session resumed by user message.'
            : 'Message accepted for processing.',
        };
      }

      case 'DuplicateMessageDetected':
        return {
          canProcess: false,
          isDuplicate: true,
          isStale: false,
          isExpired: false,
          isResumed: false,
          nextState: currentState,
          reason: 'Duplicate provider message ID ignored.',
        };

      case 'ProcessingCompleted':
        return {
          canProcess: false,
          isDuplicate: false,
          isStale: false,
          isExpired: false,
          isResumed: false,
          nextState: RuntimeState.WaitingForUser,
          reason: 'Pipeline processing completed successfully.',
        };

      case 'HumanHandoffRequested':
        return {
          canProcess: false,
          isDuplicate: false,
          isStale: false,
          isExpired: false,
          isResumed: false,
          nextState: RuntimeState.WaitingForHuman,
          reason: 'Session transitioned to human handoff.',
        };

      case 'AgentClosedHandoff':
        return {
          canProcess: false,
          isDuplicate: false,
          isStale: false,
          isExpired: false,
          isResumed: true,
          nextState: RuntimeState.WaitingForUser,
          reason:
            'Human agent closed handoff. Session returned to user wait state.',
        };

      case 'SessionTimeoutOccurred':
        return {
          canProcess: false,
          isDuplicate: false,
          isStale: false,
          isExpired: true,
          isResumed: false,
          nextState: RuntimeState.Expired,
          reason: 'Session expired due to inactivity timeout.',
        };

      default:
        return {
          canProcess: false,
          isDuplicate: false,
          isStale: false,
          isExpired: false,
          isResumed: false,
          nextState: currentState,
          reason: 'Unhandled runtime event.',
        };
    }
  }
}

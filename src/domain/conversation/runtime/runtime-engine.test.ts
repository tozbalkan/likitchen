import { describe, it, expect } from 'vitest';
import { RuntimeEngine } from './runtime-engine';
import { RuntimeState } from './types';

describe('RuntimeEngine (FSM)', () => {
  const engine = new RuntimeEngine();

  it('should accept a valid user message and transition to Processing', () => {
    const evaluation = engine.evaluate(RuntimeState.WaitingForUser, undefined, {
      type: 'UserMessageReceived',
      messageId: 'msg-1',
      revisionNumber: 1,
    });

    expect(evaluation.canProcess).toBe(true);
    expect(evaluation.nextState).toBe(RuntimeState.Processing);
    expect(evaluation.isDuplicate).toBe(false);
    expect(evaluation.isStale).toBe(false);
  });

  it('should detect duplicate message ID and prevent processing', () => {
    const currentRevision = { messageId: 'msg-1', revisionNumber: 1 };
    const evaluation = engine.evaluate(
      RuntimeState.WaitingForUser,
      currentRevision,
      {
        type: 'UserMessageReceived',
        messageId: 'msg-1',
        revisionNumber: 2,
      },
    );

    expect(evaluation.canProcess).toBe(false);
    expect(evaluation.isDuplicate).toBe(true);
    expect(evaluation.nextState).toBe(RuntimeState.WaitingForUser);
  });

  it('should detect stale revision number and prevent processing', () => {
    const currentRevision = { messageId: 'msg-2', revisionNumber: 5 };
    const evaluation = engine.evaluate(
      RuntimeState.WaitingForUser,
      currentRevision,
      {
        type: 'UserMessageReceived',
        messageId: 'msg-3',
        revisionNumber: 3,
      },
    );

    expect(evaluation.canProcess).toBe(false);
    expect(evaluation.isStale).toBe(true);
  });

  it('should resume session when user sends message while in WaitingForHuman', () => {
    const evaluation = engine.evaluate(
      RuntimeState.WaitingForHuman,
      undefined,
      {
        type: 'UserMessageReceived',
        messageId: 'msg-4',
        revisionNumber: 1,
      },
    );

    expect(evaluation.canProcess).toBe(true);
    expect(evaluation.isResumed).toBe(true);
    expect(evaluation.nextState).toBe(RuntimeState.Processing);
  });

  it('should transition to WaitingForUser when ProcessingCompleted', () => {
    const evaluation = engine.evaluate(RuntimeState.Processing, undefined, {
      type: 'ProcessingCompleted',
    });

    expect(evaluation.nextState).toBe(RuntimeState.WaitingForUser);
  });

  it('should transition to WaitingForHuman when HumanHandoffRequested', () => {
    const evaluation = engine.evaluate(RuntimeState.Processing, undefined, {
      type: 'HumanHandoffRequested',
    });

    expect(evaluation.nextState).toBe(RuntimeState.WaitingForHuman);
  });

  it('should transition to Expired on SessionTimeoutOccurred', () => {
    const evaluation = engine.evaluate(RuntimeState.WaitingForUser, undefined, {
      type: 'SessionTimeoutOccurred',
    });

    expect(evaluation.isExpired).toBe(true);
    expect(evaluation.nextState).toBe(RuntimeState.Expired);
  });
});

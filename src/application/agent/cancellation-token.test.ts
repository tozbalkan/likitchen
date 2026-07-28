import { describe, it, expect, vi } from 'vitest';
import {
  CancellationToken,
  OperationCancelledException,
} from './cancellation-token';

describe('CancellationToken', () => {
  it('defaults to not cancelled', () => {
    const token = new CancellationToken();
    expect(token.isCancelled()).toBe(false);
    expect(token.getReason()).toBeUndefined();
    expect(() => token.throwIfCancelled()).not.toThrow();
  });

  it('cancels with reason and triggers listeners', () => {
    const token = new CancellationToken();
    const listener = vi.fn();

    token.onCancelled(listener);
    token.cancel('User aborted request');

    expect(token.isCancelled()).toBe(true);
    expect(token.getReason()).toBe('User aborted request');
    expect(listener).toHaveBeenCalledWith('User aborted request');
    expect(() => token.throwIfCancelled()).toThrow(OperationCancelledException);
  });

  it('immediately triggers listener if already cancelled when listener added', () => {
    const token = new CancellationToken();
    token.cancel('Quota exceeded');

    const listener = vi.fn();
    token.onCancelled(listener);

    expect(listener).toHaveBeenCalledWith('Quota exceeded');
  });

  it('cancel is idempotent', () => {
    const token = new CancellationToken();
    const listener = vi.fn();

    token.onCancelled(listener);
    token.cancel('First reason');
    token.cancel('Second reason');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(token.getReason()).toBe('First reason');
  });
});

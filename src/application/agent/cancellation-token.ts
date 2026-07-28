export class OperationCancelledException extends Error {
  constructor(reason?: string) {
    super(
      `[CancellationToken] Operation cancelled: ${reason ?? 'No reason provided'}`,
    );
    this.name = 'OperationCancelledException';
  }
}

export type CancellationListener = (reason?: string) => void;

export class CancellationToken {
  private cancelled = false;
  private cancelReason?: string;
  private readonly listeners: CancellationListener[] = [];

  isCancelled(): boolean {
    return this.cancelled;
  }

  getReason(): string | undefined {
    return this.cancelReason;
  }

  cancel(reason?: string): void {
    if (this.cancelled) return;
    this.cancelled = true;
    if (reason !== undefined) {
      this.cancelReason = reason;
    }

    for (const listener of this.listeners) {
      try {
        if (this.cancelReason !== undefined) {
          listener(this.cancelReason);
        } else {
          listener();
        }
      } catch {
        // Suppress listener errors
      }
    }
  }

  throwIfCancelled(): void {
    if (this.cancelled) {
      if (this.cancelReason !== undefined) {
        throw new OperationCancelledException(this.cancelReason);
      } else {
        throw new OperationCancelledException();
      }
    }
  }

  onCancelled(listener: CancellationListener): void {
    if (this.cancelled) {
      if (this.cancelReason !== undefined) {
        listener(this.cancelReason);
      } else {
        listener();
      }
    } else {
      this.listeners.push(listener);
    }
  }
}

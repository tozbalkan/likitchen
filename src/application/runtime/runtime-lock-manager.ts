export interface RuntimeLockPort {
  acquireLock(sessionId: string, ttlMs: number): Promise<boolean>;
  releaseLock(sessionId: string): Promise<void>;
}

export class RuntimeLockManager {
  constructor(private readonly lockPort: RuntimeLockPort) {}

  async withLock<T>(
    sessionId: string,
    ttlMs: number,
    fn: () => Promise<T>,
  ): Promise<T | null> {
    const acquired = await this.lockPort.acquireLock(sessionId, ttlMs);
    if (!acquired) {
      return null;
    }

    try {
      return await fn();
    } finally {
      await this.lockPort.releaseLock(sessionId);
    }
  }
}

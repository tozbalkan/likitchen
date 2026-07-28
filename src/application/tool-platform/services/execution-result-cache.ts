import { ToolExecutionResult } from '../vo/tool-execution-result';

interface CachedEntry {
  readonly result: ToolExecutionResult;
  readonly expiresAt: number;
}

export class ExecutionResultCache {
  private readonly cache = new Map<string, CachedEntry>();

  get(key: string): ToolExecutionResult | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.result;
  }

  set(key: string, result: ToolExecutionResult, ttlMs: number): void {
    this.cache.set(key, {
      result,
      expiresAt: Date.now() + ttlMs,
    });
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}

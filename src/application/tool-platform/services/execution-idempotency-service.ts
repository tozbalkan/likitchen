import { ToolExecutionResult } from '../vo/tool-execution-result';

export class ExecutionIdempotencyService {
  private readonly inFlight = new Map<string, Promise<ToolExecutionResult>>();

  isExecutionInFlight(key: string): boolean {
    return this.inFlight.has(key);
  }

  getInFlight(key: string): Promise<ToolExecutionResult> | undefined {
    return this.inFlight.get(key);
  }

  registerInFlight(key: string, promise: Promise<ToolExecutionResult>): void {
    this.inFlight.set(key, promise);
    promise.finally(() => {
      this.inFlight.delete(key);
    });
  }
}

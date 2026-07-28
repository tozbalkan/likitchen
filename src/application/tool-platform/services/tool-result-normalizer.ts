import { ToolExecutionResult } from '../vo/tool-execution-result';

export class ToolResultNormalizer {
  normalize(rawResult: Readonly<ToolExecutionResult>): ToolExecutionResult {
    const normalizedOutput: Record<string, unknown> = {
      ...rawResult.output,
      __normalizedAt: new Date().toISOString(),
    };

    return new ToolExecutionResult({
      ...rawResult,
      normalizedOutput: Object.freeze(normalizedOutput),
    });
  }
}

import { ExecutionResultCache } from '../services/execution-result-cache';
import { ToolExecutionResult } from '../vo/tool-execution-result';

export interface GetCachedResultQuery {
  readonly cacheKey: string;
}

export class GetCachedResultQueryHandler {
  constructor(private readonly cache: ExecutionResultCache) {}

  execute(query: GetCachedResultQuery): ToolExecutionResult | undefined {
    return this.cache.get(query.cacheKey);
  }
}

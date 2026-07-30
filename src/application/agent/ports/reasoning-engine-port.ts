import type { TenantContext } from '../../identity/tenant-context';
import type { LLMRequest } from '../vo/llm-request';
import type { ReActCycleResult } from '../vo/react-cycle-result';

export interface ReasoningEngineOptions {
  readonly signal?: AbortSignal | undefined;
}

export interface ReasoningEnginePort {
  executeCycle(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ReasoningEngineOptions>,
  ): Promise<ReActCycleResult>;
}

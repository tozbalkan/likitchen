import type { TenantContext } from '../../identity/tenant-context';
import type { LLMRequest } from '../vo/llm-request';
import type { LLMResponse } from '../vo/llm-response';

export interface ChatCompletionOptions {
  readonly signal?: AbortSignal | undefined;
  readonly timeoutMs?: number | undefined;
  readonly correlationId?: string | undefined;
}

export interface ChatCompletionPort {
  complete(
    tenantContext: Readonly<TenantContext>,
    request: Readonly<LLMRequest>,
    options?: Readonly<ChatCompletionOptions>,
  ): Promise<LLMResponse>;
}
